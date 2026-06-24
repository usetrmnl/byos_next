import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import { DEVICE_SETUP_REFRESH_SECONDS } from "@/lib/device/defaults";
import { isRecord, stringifyLogValue } from "@/lib/device/log-values";
import { resolveUserIdFromApiKey } from "@/lib/device/request-headers";
import { logError, logInfo } from "@/lib/logger";

interface LogEntry {
	creation_timestamp: number;
	message?: string;
	level?: string;
	device_status?: string;
	battery_voltage?: number;
	rssi?: number;
	firmware_version?: string;
}

type NormalizedLogEntry = LogEntry & Record<string, unknown>;

type LogData = {
	logs_array: NormalizedLogEntry[];
	device_id?: string;
	timestamp?: string;
};

function parseLogEntries(body: unknown): unknown[] | null {
	if (!isRecord(body) || !Array.isArray(body.logs)) {
		return null;
	}
	return body.logs;
}

function normalizeIncomingLog(log: unknown): NormalizedLogEntry {
	const now = Math.floor(Date.now() / 1000);

	if (!isRecord(log)) {
		return {
			creation_timestamp: now,
			message: stringifyLogValue(log),
			timestamp: new Date().toISOString(),
		};
	}

	const creationTimestamp =
		typeof log.creation_timestamp === "number" &&
		Number.isFinite(log.creation_timestamp)
			? log.creation_timestamp
			: now;
	const normalized: NormalizedLogEntry = {
		...log,
		creation_timestamp: creationTimestamp,
		timestamp: new Date(creationTimestamp * 1000).toISOString(),
	};

	if ("message" in normalized) {
		normalized.message = stringifyLogValue(normalized.message);
	}
	if ("log_message" in normalized) {
		normalized.log_message = stringifyLogValue(normalized.log_message);
	}
	if (!("message" in normalized) && !("log_message" in normalized)) {
		normalized.message = stringifyLogValue(log);
	}

	return normalized;
}

function parseRefreshRateHeader(refreshRate: string | null): number {
	const parsed = refreshRate ? Number.parseInt(refreshRate, 10) : NaN;
	return Number.isFinite(parsed) && parsed > 0
		? parsed
		: DEVICE_SETUP_REFRESH_SECONDS;
}

function nextExpectedUpdateFromRefresh(refreshRate: string | null): string {
	return new Date(
		Date.now() + parseRefreshRateHeader(refreshRate) * 1000,
	).toISOString();
}

type DeviceMetricsSnapshot = {
	battery_voltage: number | string | null;
	firmware_version: string | null;
	rssi: number | null;
};

async function updateLogDeviceMetrics({
	scopedDb,
	deviceId,
	current,
	refreshRate,
	batteryVoltage,
	fwVersion,
	rssi,
	errorMessage = "Error updating device metrics",
	metadata = {},
}: {
	scopedDb: typeof db;
	deviceId: string;
	current: DeviceMetricsSnapshot;
	refreshRate: string | null;
	batteryVoltage: string | null;
	fwVersion: string | null;
	rssi: string | null;
	errorMessage?: string;
	metadata?: Record<string, unknown>;
}) {
	try {
		await scopedDb
			.updateTable("devices")
			.set({
				last_update_time: new Date().toISOString(),
				next_expected_update: nextExpectedUpdateFromRefresh(refreshRate),
				battery_voltage: batteryVoltage
					? Number.parseFloat(batteryVoltage)
					: current.battery_voltage,
				firmware_version: fwVersion || current.firmware_version,
				rssi: rssi ? Number.parseInt(rssi, 10) : current.rssi,
				updated_at: new Date().toISOString(),
			})
			.where("friendly_id", "=", deviceId)
			.execute();
	} catch (error) {
		logError(new Error(errorMessage), {
			source: "api/log",
			metadata: {
				device_id: deviceId,
				error,
				...metadata,
			},
		});
	}
}

async function updateLogDeviceMacAddress({
	scopedDb,
	deviceId,
	macAddress,
	successMessage,
	errorMessage = "Error updating MAC address for device",
	metadata = {},
}: {
	scopedDb: typeof db;
	deviceId: string;
	macAddress: string;
	successMessage: string;
	errorMessage?: string;
	metadata?: Record<string, unknown>;
}) {
	try {
		await scopedDb
			.updateTable("devices")
			.set({
				mac_address: macAddress,
				updated_at: new Date().toISOString(),
			})
			.where("friendly_id", "=", deviceId)
			.execute();

		logInfo(successMessage, {
			source: "api/log",
			metadata: {
				device_id: deviceId,
				mac_address: macAddress,
				...metadata,
			},
		});
	} catch (error) {
		logError(new Error(errorMessage), {
			source: "api/log",
			metadata: {
				device_id: deviceId,
				mac_address: macAddress,
				error,
				...metadata,
			},
		});
	}
}

export async function GET(request: Request) {
	logInfo("Log API GET Request received (unexpected)", {
		source: "api/log",
		metadata: {
			url: request.url,
			method: request.method,
			path: new URL(request.url).pathname,
			search: new URL(request.url).search,
			origin: new URL(request.url).origin,
		},
	});

	// Simply return 404 for GET requests
	return NextResponse.json(
		{
			status: 404,
			message: "Not found",
		},
		{ status: 404 },
	);
}

export async function POST(request: Request) {
	// Log request details
	logInfo("Log API Request", {
		source: "api/log",
		metadata: {
			url: request.url,
			method: request.method,
			path: new URL(request.url).pathname,
			search: new URL(request.url).search,
			origin: new URL(request.url).origin,
		},
	});

	try {
		const macAddress = request.headers.get("ID")?.toUpperCase();
		const apiKey = request.headers.get("Access-Token");

		// TRMNL API requires Access-Token header
		if (!apiKey) {
			return NextResponse.json(
				{
					error: "Access-Token header is required",
				},
				{ status: 401 },
			);
		}

		const logsArray = parseLogEntries(await request.json());
		if (!logsArray) {
			return NextResponse.json(
				{
					error: "Invalid request body. Expected { 'logs': [] }",
				},
				{ status: 422 },
			);
		}

		const refreshRate = request.headers.get("Refresh-Rate");
		const batteryVoltage = request.headers.get("Battery-Voltage");
		const fwVersion = request.headers.get("FW-Version");
		const rssi = request.headers.get("RSSI");
		const { ready } = await checkDbConnection();

		if (!ready) {
			console.warn(
				"Database client not initialized, using noDB mode, skipping log processing",
			);
			logInfo(
				"Database client not initialized, using noDB mode, skipping log processing",
				{
					source: "api/log",
					metadata: {
						macAddress: macAddress || null,
						hasApiKey: Boolean(apiKey),
						refreshRate: refreshRate || null,
						batteryVoltage: batteryVoltage || null,
						fwVersion: fwVersion || null,
						rssi: rssi || null,
					},
				},
			);
			return NextResponse.json(
				{
					status: 503,
					message: "Database not available",
				},
				{ status: 503 },
			);
		}

		const currentUserId = await resolveUserIdFromApiKey(apiKey, {
			assumeDbReady: true,
		});
		if (!currentUserId) {
			logError("Refusing logs for device without an owner", {
				source: "api/log",
				metadata: { macAddress, hasApiKey: true },
			});
			return NextResponse.json(
				{
					status: 400,
					message: "Device owner is required before logs can be accepted",
				},
				{ status: 400 },
			);
		}

		return await withExplicitUserScope(currentUserId, async (scopedDb) => {
			const device = await scopedDb
				.selectFrom("devices")
				.selectAll()
				.where("api_key", "=", apiKey)
				.executeTakeFirst();

			if (!device) {
				return NextResponse.json(
					{
						status: 400,
						message: "Device owner is required before logs can be accepted",
					},
					{ status: 400 },
				);
			}

			const deviceStatus = "known";
			if (macAddress && macAddress !== device.mac_address) {
				const existingDeviceWithMac = await scopedDb
					.selectFrom("devices")
					.select(["id", "friendly_id"])
					.where("mac_address", "=", macAddress)
					.executeTakeFirst();

				if (
					existingDeviceWithMac &&
					String(existingDeviceWithMac.id) !== String(device.id)
				) {
					logError("Refusing logs with mismatched device identity", {
						source: "api/log",
						metadata: {
							token_device_id: device.friendly_id,
							mac_device_id: existingDeviceWithMac.friendly_id,
							mac_address: macAddress,
						},
					});
					return NextResponse.json(
						{
							status: 409,
							message:
								"Access token and MAC address refer to different devices",
						},
						{ status: 409 },
					);
				}

				await updateLogDeviceMacAddress({
					scopedDb,
					deviceId: device.friendly_id,
					macAddress,
					successMessage: "Updated device with MAC address",
				});
			}

			await updateLogDeviceMetrics({
				scopedDb,
				deviceId: device.friendly_id,
				current: device,
				refreshRate,
				batteryVoltage,
				fwVersion,
				rssi,
			});

			const logData: LogData = {
				logs_array: logsArray.map(normalizeIncomingLog),
			};

			try {
				await scopedDb
					.insertInto("logs")
					.values({
						friendly_id: device.friendly_id,
						log_data: JSON.stringify(logData),
					})
					.execute();
			} catch (error) {
				logError(new Error("Error inserting log with device ID"), {
					source: "api/log",
					metadata: {
						device_id: device.friendly_id,
						error,
						refresh_rate: refreshRate,
						battery_voltage: batteryVoltage,
						fw_version: fwVersion,
						rssi,
						device_status: deviceStatus,
					},
				});

				return NextResponse.json(
					{
						status: 500,
						message: "Failed to save logs",
					},
					{ status: 500 },
				);
			}

			logInfo("Log saved successfully", {
				source: "api/log",
				metadata: {
					device_id: device.friendly_id,
					logs_count: logsArray.length,
					refresh_rate: refreshRate,
					battery_voltage: batteryVoltage,
					fw_version: fwVersion,
					rssi,
					device_status: deviceStatus,
				},
			});

			return new NextResponse(null, { status: 204 });
		});
	} catch (error) {
		// The error object already contains the stack trace
		logError(error as Error, {
			source: "api/log",
		});
		return NextResponse.json(
			{
				status: 500,
				message: "Internal server error",
			},
			{ status: 500 },
		);
	}
}
