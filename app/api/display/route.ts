import { db } from "@/lib/database/db";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	DISPLAY_FALLBACK_REFRESH_SECONDS,
	normalizeRefreshSchedule,
} from "@/lib/device/defaults";
import { selectDisplayForDevice } from "@/lib/display/select";
import { getLatestFirmware, isUpdateAvailable } from "@/lib/firmware";
import { logError, logInfo } from "@/lib/logger";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	buildDeviceImageFilename,
	buildDeviceImageUrl,
} from "@/lib/render/device-image-url";
import {
	buildClaimResponse,
	buildDisplayResponse,
	buildErrorResponse,
	calculateRefreshRate,
	findOrCreateDevice,
	getActivePlaylistItem,
	parseRequestHeaders,
	precacheImageInBackground,
	updateDeviceStatus,
} from "./utils";

export const DEFAULT_REFRESH_RATE = DISPLAY_FALLBACK_REFRESH_SECONDS;

function errorImageQuery(baseQueryParams: string, message: string): string {
	const params = new URLSearchParams(baseQueryParams);
	params.set("message", message);
	return params.toString();
}

export async function GET(request: Request) {
	const headers = parseRequestHeaders(request);
	const baseUrl = `${headers.hostUrl}/api/bitmap`;
	const uniqueId =
		Math.random().toString(36).substring(2, 7) +
		Date.now().toString(36).slice(-3);

	if (!headers.apiKey) {
		return buildErrorResponse(
			"Access-Token header is required",
			baseUrl,
			uniqueId,
			401,
		);
	}

	const { ready } = await checkDbConnection();

	if (!ready) {
		logError("Database not available for display request", {
			source: "api/display",
		});
		return buildErrorResponse("Database not available", baseUrl, uniqueId, 503);
	}

	logInfo("Display API Request", {
		source: "api/display",
		metadata: { apiKey: headers.apiKey?.slice(0, 6) },
	});

	try {
		const lookup = await findOrCreateDevice(headers);
		const { device } = lookup;

		if (!device) {
			if (lookup.claimCode) {
				logInfo("Returning pending device claim code", {
					source: "api/display",
					metadata: {
						apiKey: headers.apiKey?.slice(0, 6),
						macAddress: headers.macAddress,
					},
				});
				return buildClaimResponse(lookup.claimCode, baseUrl, uniqueId);
			}
			logError("Error fetching/creating device", {
				source: "api/display",
				metadata: { apiKey: headers.apiKey?.slice(0, 6) },
			});
			return buildErrorResponse("Device not found", baseUrl, uniqueId);
		}

		const selection = await selectDisplayForDevice(device, {
			hostUrl: headers.hostUrl,
			width: headers.width,
			height: headers.height,
			base64: headers.base64,
		});

		let { screen: screenToDisplay, imageUrl } = selection;
		let dynamicRefreshRate: number;

		switch (device.display_mode) {
			case DeviceDisplayMode.PLAYLIST: {
				if (device.playlist_id) {
					const activeItem = await getActivePlaylistItem(
						device.playlist_id,
						device.current_playlist_index || 0,
						device.timezone || "UTC",
						device.user_id,
					);

					if (activeItem) {
						screenToDisplay = activeItem.screen_id;
						dynamicRefreshRate = activeItem.duration;
						const updatePlaylistIndex = (scopedDb: typeof db) =>
							scopedDb
								.updateTable("devices")
								.set({ current_playlist_index: activeItem.order_index })
								.where("id", "=", device.id.toString())
								.execute();
						if (device.user_id) {
							await withExplicitUserScope(device.user_id, updatePlaylistIndex);
						} else {
							await updatePlaylistIndex(db);
						}
					} else {
						logInfo("No active playlist item found", {
							source: "api/display",
							metadata: { deviceId: device.friendly_id },
						});
						screenToDisplay = "error";
						imageUrl = buildDeviceImageUrl({
							baseUrl,
							imagePath: "error",
							profile: selection.profile,
							query: errorImageQuery(
								selection.baseQueryParams,
								"No active playlist item",
							),
						});
						dynamicRefreshRate = DEFAULT_REFRESH_RATE;
					}
				} else {
					screenToDisplay = "error";
					imageUrl = buildDeviceImageUrl({
						baseUrl,
						imagePath: "error",
						profile: selection.profile,
						query: errorImageQuery(
							selection.baseQueryParams,
							"Playlist mode needs a playlist",
						),
					});
					dynamicRefreshRate = DEFAULT_REFRESH_RATE;
				}
				if (screenToDisplay !== "error") {
					imageUrl = buildDeviceImageUrl({
						baseUrl,
						imagePath: screenToDisplay,
						profile: selection.profile,
						query: selection.baseQueryParams,
					});
				}
				break;
			}

			case DeviceDisplayMode.MIXUP:
				if (device.mixup_id) {
					imageUrl = buildDeviceImageUrl({
						baseUrl,
						imagePath: `mixup/${device.mixup_id}`,
						profile: selection.profile,
						query: `${selection.baseQueryParams}&access_token=${encodeURIComponent(
							headers.apiKey,
						)}`,
					});
					logInfo("Using mixup display mode", {
						source: "api/display",
						metadata: {
							deviceId: device.friendly_id,
							mixupId: device.mixup_id,
						},
					});
				}
				dynamicRefreshRate = calculateRefreshRate(
					normalizeRefreshSchedule(device.refresh_schedule),
					DEFAULT_REFRESH_RATE,
					device.timezone || "UTC",
				);
				break;

			default:
				dynamicRefreshRate = calculateRefreshRate(
					normalizeRefreshSchedule(device.refresh_schedule),
					DEFAULT_REFRESH_RATE,
					device.timezone || "UTC",
				);
				break;
		}

		precacheImageInBackground(imageUrl, device.friendly_id);
		updateDeviceStatus(device, headers, dynamicRefreshRate);

		logInfo("Display request successful", {
			source: "api/display",
			metadata: {
				deviceId: device.friendly_id,
				screen: screenToDisplay,
				refreshRate: dynamicRefreshRate,
				displayMode: device.display_mode,
			},
		});

		const orientation = device.screen_orientation || "landscape";
		const firmwareExtra: Record<string, unknown> = {
			// 0 = portrait (no rotation), 1 = landscape (90° rotation).
			image_rotate: orientation === "landscape" ? 1 : 0,
			// Display tuning profile. Firmware reads this only when it sent
			// `temperature-profile: true` in the request.
			temperature_profile: device.temperature_profile ?? "default",
		};

		const latestFirmware = await getLatestFirmware();
		if (
			latestFirmware &&
			isUpdateAvailable(device.firmware_version, latestFirmware.version)
		) {
			firmwareExtra.update_firmware = true;
			firmwareExtra.firmware_url = latestFirmware.downloadUrl;
			logInfo("Firmware update available", {
				source: "api/display",
				metadata: {
					deviceId: device.friendly_id,
					currentVersion: device.firmware_version,
					latestVersion: latestFirmware.version,
				},
			});
		}

		return buildDisplayResponse(
			imageUrl,
			buildDeviceImageFilename(screenToDisplay, uniqueId, selection.profile),
			dynamicRefreshRate,
			firmwareExtra,
		);
	} catch (error) {
		logError(error instanceof Error ? error : new Error(String(error)), {
			source: "api/display",
			metadata: {
				apiKey: headers.apiKey?.slice(0, 6),
				reportedModel: headers.model,
				uniqueId,
			},
		});
		return buildErrorResponse("Internal server error", baseUrl, uniqueId);
	}
}
