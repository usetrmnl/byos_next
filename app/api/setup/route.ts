import { connection, NextResponse } from "next/server";
import type { CustomError } from "@/lib/api/types";
import { getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import {
	withDeviceApiKey,
	withExplicitUserScope,
} from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	DEFAULT_DEVICE_SCREEN,
	DEVICE_SLEEP_REFRESH_SECONDS,
} from "@/lib/device/defaults";
import { createProvisionedDevice } from "@/lib/device/provisioning";
import { summarizeDeviceRequest } from "@/lib/device/request-debug";
import { logError, logInfo, logWarn } from "@/lib/logger";
import {
	type ModelStorageResolution,
	resolveModelForStorage,
} from "@/lib/trmnl/model-storage";
import { generateApiKey, generateFriendlyId } from "@/utils/helpers";

function logUnknownSetupModel(
	modelResolution: ModelStorageResolution,
	friendlyId: string,
): void {
	if (!modelResolution.reportedUnknown) return;

	logWarn("Device setup reported unknown TRMNL model; using default model", {
		source: "api/setup",
		metadata: {
			friendly_id: friendlyId,
			reportedModel: modelResolution.reportedUnknown,
			resolvedModel: modelResolution.resolvedModelName,
			defaulted: modelResolution.defaulted,
		},
	});
}

async function resolveSetupUserId(
	apiKey: string | null,
	macAddress: string | null,
): Promise<string | null> {
	if (apiKey) {
		const device = await withDeviceApiKey(apiKey, (scopedDb) =>
			scopedDb
				.selectFrom("devices")
				.select("user_id")
				.where("api_key", "=", apiKey)
				.executeTakeFirst(),
		);
		if (device?.user_id) return device.user_id;
	}

	// TRMNL /api/setup often omits Access-Token. Allow setup when the device was
	// pre-registered with its hardware MAC from trmnl.com/devices.
	if (macAddress) {
		const device = await db
			.selectFrom("devices")
			.select("user_id")
			.where("mac_address", "=", macAddress)
			.executeTakeFirst();
		if (device?.user_id) return device.user_id;
	}

	return getCurrentUserId();
}

export async function GET(request: Request) {
	// Tell the cache-components prerender the route is request-scoped so it
	// doesn't try to evaluate the body at build time and bail on header reads.
	await connection();
	const requestSummary = summarizeDeviceRequest(request);
	try {
		const macAddress = request.headers.get("ID")?.toUpperCase();
		const apiKey = request.headers.get("Access-Token");
		const model = request.headers.get("Model");
		const { ready } = await checkDbConnection();

		logInfo("Device setup request", {
			source: "api/setup",
			metadata: requestSummary,
		});

		if (!ready) {
			console.warn(
				"Database client not initialized, using noDB mode, skipping device setup",
			);
			logInfo(
				"Database client not initialized, using noDB mode, skipping device setup",
				{
					source: "api/setup",
					metadata: {
						macAddress: macAddress || null,
						hasApiKey: Boolean(apiKey),
					},
				},
			);
			return NextResponse.json(
				{
					status: 503,
					message: "Device setup skipped",
				},
				{ status: 503 },
			);
		}

		if (!macAddress) {
			const error = new Error("Missing ID header");
			logError(error, {
				source: "api/setup",
				metadata: {
					macAddress: macAddress || null,
					hasApiKey: Boolean(apiKey),
					model: model || null,
				},
			});
			return NextResponse.json(
				{
					status: 400,
					api_key: null,
					friendly_id: null,
					image_url: null,
					message: "ID header is required",
				},
				{ status: 400 },
			);
		}

		// TRMNL API requires Model header
		if (!model) {
			return NextResponse.json(
				{
					status: 400,
					api_key: null,
					friendly_id: null,
					image_url: null,
					message: "Model header is required",
				},
				{ status: 400 },
			);
		}

		const currentUserId = await resolveSetupUserId(apiKey, macAddress ?? null);
		if (!currentUserId) {
			logError("Refusing to set up an unowned device", {
				source: "api/setup",
				metadata: {
					...requestSummary,
					hint: requestSummary.hasApiKey
						? "Access-Token did not match any registered device. Check the API key from trmnl.com/devices."
						: "Device did not send Access-Token. Add the device in BYOS with its MAC address from trmnl.com/devices, or use a claim code after pointing the device at this server.",
				},
			});
			return NextResponse.json(
				{
					status: 403,
					api_key: null,
					friendly_id: null,
					image_url: null,
					message: "Device setup requires an authenticated owner",
				},
				{ status: 403 },
			);
		}

		// First check if the device exists by MAC address
		const device = await withExplicitUserScope(currentUserId, (scopedDb) =>
			scopedDb
				.selectFrom("devices")
				.selectAll()
				.where("mac_address", "=", macAddress)
				.executeTakeFirst(),
		);

		// If API key is provided and device not found by MAC, check if the API key exists
		if (!device && apiKey) {
			const deviceByApiKey = await withExplicitUserScope(
				currentUserId,
				(scopedDb) =>
					scopedDb
						.selectFrom("devices")
						.selectAll()
						.where("api_key", "=", apiKey)
						.executeTakeFirst(),
			);

			if (deviceByApiKey) {
				// Device found by API key, update its MAC address
				try {
					await withExplicitUserScope(currentUserId, (scopedDb) =>
						scopedDb
							.updateTable("devices")
							.set({
								mac_address: macAddress,
								updated_at: new Date().toISOString(),
							})
							.where("friendly_id", "=", deviceByApiKey.friendly_id)
							.execute(),
					);

					logInfo("Updated device MAC address", {
						source: "api/setup",
						metadata: {
							device_id: deviceByApiKey.friendly_id,
							mac_address: macAddress,
							has_api_key: Boolean(apiKey),
						},
					});

					// Return the existing device info
					return NextResponse.json(
						{
							status: 200,
							api_key: deviceByApiKey.api_key,
							friendly_id: deviceByApiKey.friendly_id,
							image_url: null,
							filename: null,
							message: `Device ${deviceByApiKey.friendly_id} updated with new MAC address!`,
						},
						{ status: 200 },
					);
				} catch (updateError) {
					logError(new Error("Error updating MAC address for device"), {
						source: "api/setup",
						metadata: {
							device_id: deviceByApiKey.friendly_id,
							mac_address: macAddress,
							has_api_key: Boolean(apiKey),
							error: updateError,
						},
					});
				}
			}
		}

		// If device not found by MAC address or API key, create a new one
		if (!device) {
			const friendly_id = generateFriendlyId(
				macAddress,
				new Date().toISOString().replace(/[-:Z]/g, ""),
			);
			// Use provided API key if available, otherwise generate a new one
			const api_key =
				apiKey ||
				generateApiKey(
					macAddress,
					new Date().toISOString().replace(/[-:Z]/g, ""),
				);
			const modelResolution = await resolveModelForStorage(model);

			try {
				const newDevice = await withExplicitUserScope(
					currentUserId,
					(scopedDb) =>
						createProvisionedDevice(scopedDb, {
							macAddress,
							name: `TRMNL Device ${friendly_id}`,
							friendlyId: friendly_id,
							apiKey: api_key,
							userId: currentUserId,
							nextExpectedRefreshSeconds: DEVICE_SLEEP_REFRESH_SECONDS,
							screen: DEFAULT_DEVICE_SCREEN,
							model: modelResolution.modelName ?? null,
						}),
				);

				if (!newDevice) {
					throw new Error("Failed to create new device record");
				}

				logInfo(`New device ${newDevice.friendly_id} created!`, {
					source: "api/setup",
					metadata: {
						friendly_id: newDevice.friendly_id,
						mac_address: macAddress,
						has_api_key: Boolean(api_key),
					},
				});
				logUnknownSetupModel(modelResolution, newDevice.friendly_id);
				return NextResponse.json(
					{
						status: 200,
						api_key: newDevice.api_key,
						friendly_id: newDevice.friendly_id,
						image_url: null,
						filename: null,
						message: `Device ${newDevice.friendly_id} added to BYOS!`,
					},
					{ status: 200 },
				);
			} catch (createError) {
				// Create an error object with the error details
				const deviceError: CustomError = new Error("Error creating device");
				// Attach the original error information
				(deviceError as CustomError).originalError = createError;

				logError(deviceError, {
					source: "api/setup",
					metadata: { macAddress, friendly_id, has_api_key: Boolean(api_key) },
				});

				return NextResponse.json(
					{
						status: 500,
						reset_firmware: false,
						message: `Error creating new device. ${friendly_id}`,
					},
					{ status: 500 },
				);
			}
		}

		// Device exists by MAC address - check if we need to update the API key
		let currentApiKey = device.api_key;
		const canManageExistingDevice =
			apiKey === device.api_key ||
			(Boolean(currentUserId) && device.user_id === currentUserId);

		if (!canManageExistingDevice) {
			logError(
				"Refusing setup for device without owner or valid access token",
				{
					source: "api/setup",
					metadata: {
						friendly_id: device.friendly_id,
						mac_address: macAddress,
						hasApiKey: Boolean(apiKey),
					},
				},
			);
			return NextResponse.json(
				{
					status: 403,
					api_key: null,
					friendly_id: null,
					image_url: null,
					message:
						"Device setup requires a valid access token or owner session",
				},
				{ status: 403 },
			);
		}

		if (apiKey && apiKey !== device.api_key) {
			try {
				await withExplicitUserScope(currentUserId, (scopedDb) =>
					scopedDb
						.updateTable("devices")
						.set({
							api_key: apiKey,
							updated_at: new Date().toISOString(),
						})
						.where("friendly_id", "=", device.friendly_id)
						.execute(),
				);

				logInfo("Updated API key for device", {
					source: "api/setup",
					metadata: {
						device_id: device.friendly_id,
						mac_address: macAddress,
					},
				});
				// Update the device object with the new API key
				currentApiKey = apiKey;
			} catch (updateError) {
				logError(new Error("Error updating API key for device"), {
					source: "api/setup",
					metadata: {
						device_id: device.friendly_id,
						mac_address: macAddress,
						error: updateError,
					},
				});
			}
		}

		logInfo(`Device ${device.friendly_id} added to BYOS!`, {
			source: "api/setup",
			metadata: {
				friendly_id: device.friendly_id,
				mac_address: macAddress,
				has_api_key: Boolean(currentApiKey),
			},
		});
		return NextResponse.json(
			{
				status: 200,
				api_key: currentApiKey,
				friendly_id: device.friendly_id,
				image_url: null,
				filename: null,
				message: `Device ${device.friendly_id} added to BYOS!`,
			},
			{ status: 200 },
		);
	} catch (error) {
		// The error object already contains the stack trace
		logError(error as Error, {
			source: "api/setup",
		});
		return NextResponse.json(
			{
				status: 500,
				error: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
