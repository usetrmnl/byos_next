import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { logError, logInfo } from "@/lib/logger";
import { logger } from "@/lib/recipes/recipe-renderer";
import type {
	Device,
	PlaylistItem,
	RefreshSchedule,
	TimeRange,
} from "@/lib/types";
import { generateApiKey, generateFriendlyId, timezones } from "@/utils/helpers";
import { DEFAULT_SCREEN } from "./route";

// --- Types ---

export interface RequestHeaders {
	apiKey: string | null;
	macAddress: string | null;
	refreshRate: string | null;
	batteryVoltage: string | null;
	fwVersion: string | null;
	rssi: string | null;
	hostUrl: string;
}

// --- Header Parsing ---

export const parseRequestHeaders = (request: Request): RequestHeaders => {
	const headers = request.headers;
	return {
		apiKey: headers.get("Access-Token"),
		macAddress: headers.get("ID")?.toUpperCase() || null,
		refreshRate: headers.get("Refresh-Rate"),
		batteryVoltage: headers.get("Battery-Voltage"),
		fwVersion: headers.get("FW-Version"),
		rssi: headers.get("RSSI"),
		hostUrl:
			(headers.get("x-forwarded-proto") || "http") +
			"://" +
			(headers.get("x-forwarded-host") || headers.get("host") || "localhost"),
	};
};

// --- Helper Functions ---

export const generateMockMacAddress = (apiKey: string): string => {
	const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
	const macPart = hash.substring(hash.length - 6).toUpperCase();
	return `A1:B2:C3:${macPart.substring(0, 2)}:${macPart.substring(2, 4)}:${macPart.substring(4, 6)}`;
};

export const precacheImageInBackground = (
	imageUrl: string,
	friendlyId: string,
): void => {
	fetch(imageUrl, { method: "GET" })
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Failed to cache image: ${response.status}`);
			}
			logInfo("Image pre-cached successfully", {
				source: "api/display",
				metadata: { imageUrl, friendlyId },
			});
		})
		.catch((error: Error) => {
			logError("Failed to precache image", {
				source: "api/display",
				metadata: { imageUrl, error: error.message, friendlyId },
			});
		});
};

export const isTimeInRange = (
	timeToCheck: string,
	startTime: string,
	endTime: string,
): boolean => {
	if (startTime > endTime) {
		return timeToCheck >= startTime || timeToCheck < endTime;
	}
	return timeToCheck >= startTime && timeToCheck < endTime;
};

export const calculateRefreshRate = (
	refreshSchedule: RefreshSchedule | null,
	defaultRefreshRate: number,
	timezone: string = timezones[0].value,
): number => {
	if (!refreshSchedule) {
		return defaultRefreshRate;
	}

	const now = new Date();
	const options = {
		timeZone: timezone,
		hour12: false,
	} as Intl.DateTimeFormatOptions;
	const formatter = new Intl.DateTimeFormat("en-US", {
		...options,
		hour: "2-digit",
		minute: "2-digit",
	});

	const [{ value: hour }, , { value: minute }] = formatter.formatToParts(now);
	const currentTimeString = `${hour}:${minute}`;

	for (const range of refreshSchedule.time_ranges as TimeRange[]) {
		if (isTimeInRange(currentTimeString, range.start_time, range.end_time)) {
			return range.refresh_rate;
		}
	}

	return refreshSchedule.default_refresh_rate;
};

export const getActivePlaylistItem = async (
	playlistId: string,
	currentIndex: number,
	timezone: string = "UTC",
): Promise<PlaylistItem | null> => {
	const { ready } = await checkDbConnection();
	if (!ready) return null;

	const items = await db
		.selectFrom("playlist_items")
		.selectAll()
		.where("playlist_id", "=", playlistId)
		.orderBy("order_index", "asc")
		.execute();

	if (!items || items.length === 0) {
		logError("No items in playlist", {
			source: "api/display",
			metadata: { playlistId },
		});
		return null;
	}

	const now = new Date();
	const options = {
		timeZone: timezone,
		hour12: false,
	} as Intl.DateTimeFormatOptions;

	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		hour: "2-digit",
		minute: "2-digit",
	});
	const [{ value: hour }, , { value: minute }] =
		timeFormatter.formatToParts(now);
	const currentTime = `${hour}:${minute}`;

	const dayFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		weekday: "long",
	});
	const currentDay = dayFormatter.format(now).toLowerCase();

	const metadata = {
		playlistId,
		currentIndex,
		timezone,
		currentTime,
		currentDay,
		totalItems: items.length,
	};
	logInfo("Checking playlist items for time/day match", {
		source: "api/display",
		metadata,
	});

	for (let i = 1; i < items.length + 1; i++) {
		const itemIndex = (currentIndex + i) % items.length;
		const item = items[itemIndex];

		const days_of_week = item.days_of_week as string[] | null;
		const start_time = item.start_time;
		const end_time = item.end_time;

		const isTimeValid =
			!start_time ||
			!end_time ||
			isTimeInRange(currentTime, start_time, end_time);
		const isDayValid =
			!days_of_week ||
			(Array.isArray(days_of_week) && days_of_week.includes(currentDay));

		if (isTimeValid && isDayValid) {
			return item as unknown as PlaylistItem;
		}
	}

	return null;
};

// --- Device Management ---

export const updateDeviceStatus = async (
	device: Device,
	headers: RequestHeaders,
	refreshDurationSeconds: number,
): Promise<void> => {
	const now = new Date();
	const nextExpectedUpdate = new Date(
		now.getTime() + refreshDurationSeconds * 1000,
	);

	const updateData: Partial<Device> = {
		last_update_time: now.toISOString(),
		next_expected_update: nextExpectedUpdate.toISOString(),
		last_refresh_duration: Math.round(refreshDurationSeconds),
		updated_at: now.toISOString(),
	};

	if (headers.batteryVoltage) {
		updateData.battery_voltage = Number.parseFloat(headers.batteryVoltage);
	}
	if (headers.fwVersion) {
		updateData.firmware_version = headers.fwVersion;
	}
	if (headers.rssi) {
		updateData.rssi = Number.parseInt(headers.rssi, 10);
	}
	if (device.timezone) {
		updateData.timezone = device.timezone;
	}

	try {
		await db
			.updateTable("devices")
			.set(updateData)
			.where("id", "=", device.id.toString())
			.execute();
	} catch (_error) {
		logError("Error updating device status", {
			source: "api/display",
			metadata: { deviceId: device.id, headers },
		});
	}
};

export const findOrCreateDevice = async (
	headers: RequestHeaders,
): Promise<Device | null> => {
	const { apiKey, macAddress } = headers;

	// 1. Try finding by API Key
	if (apiKey) {
		const deviceByApiKey = await db
			.selectFrom("devices")
			.selectAll()
			.where("api_key", "=", apiKey)
			.executeTakeFirst();

		if (deviceByApiKey) {
			const device = deviceByApiKey as unknown as Device;
			// Update MAC if needed
			if (macAddress && macAddress !== device.mac_address) {
				await db
					.updateTable("devices")
					.set({
						mac_address: macAddress,
						updated_at: new Date().toISOString(),
					})
					.where("id", "=", device.id.toString())
					.execute();
				logInfo("Updated MAC address for device", {
					source: "api/display",
					metadata: { deviceId: device.friendly_id },
				});
			}
			return device;
		}
	}

	// 2. Try finding by MAC Address
	if (macAddress) {
		const deviceByMac = await db
			.selectFrom("devices")
			.selectAll()
			.where("mac_address", "=", macAddress)
			.executeTakeFirst();

		if (deviceByMac) {
			const device = deviceByMac as unknown as Device;
			// Update API Key if needed
			if (apiKey && apiKey !== device.api_key) {
				await db
					.updateTable("devices")
					.set({ api_key: apiKey, updated_at: new Date().toISOString() })
					.where("id", "=", device.id.toString())
					.execute();
				logInfo("Updated API key for device", {
					source: "api/display",
					metadata: { deviceId: device.friendly_id },
				});
			}
			return device;
		}
	}

	// 3. Create new device or use mock
	if (apiKey) {
		// New device by explicit MAC
		if (macAddress) {
			const friendly_id = generateFriendlyId(
				macAddress,
				new Date().toISOString().replace(/[-:Z]/g, ""),
			);
			try {
				const newDevice = await db
					.insertInto("devices")
					.values({
						mac_address: macAddress,
						name: `TRMNL Device ${friendly_id}`,
						friendly_id: friendly_id,
						api_key: apiKey,
						refresh_schedule: JSON.stringify({
							default_refresh_rate: headers.refreshRate
								? Number.parseInt(headers.refreshRate, 10)
								: 60,
							time_ranges: [],
						}),
						last_update_time: new Date().toISOString(),
						next_expected_update: new Date(
							Date.now() + 3600 * 1000,
						).toISOString(),
						timezone: "UTC",
						screen: DEFAULT_SCREEN,
					})
					.returningAll()
					.executeTakeFirst();

				if (newDevice) {
					logInfo("Created new device with provided MAC address", {
						source: "api/display",
						metadata: { friendly_id },
					});
					return newDevice as unknown as Device;
				}
			} catch (e) {
				logError("Error creating device with provided MAC", {
					source: "api/display",
					metadata: { error: e },
				});
			}
		}

		// Mock Device logic
		const mockMacAddress = generateMockMacAddress(apiKey);
		const existingMock = await db
			.selectFrom("devices")
			.selectAll()
			.where("mac_address", "=", mockMacAddress)
			.executeTakeFirst();

		if (existingMock) {
			const device = existingMock as unknown as Device;
			if (macAddress) {
				await db
					.updateTable("devices")
					.set({ mac_address: macAddress })
					.where("id", "=", device.id.toString())
					.execute();
			}
			logInfo("Using existing mock device", {
				source: "api/display",
				metadata: { friendly_id: device.friendly_id },
			});
			return device;
		}

		// Create Mock Device
		const friendly_id = generateFriendlyId(
			mockMacAddress,
			new Date().toISOString().replace(/[-:Z]/g, ""),
		);
		const new_api_key = macAddress
			? apiKey
			: generateApiKey(
					mockMacAddress,
					new Date().toISOString().replace(/[-:Z]/g, ""),
				);

		try {
			const newDevice = await db
				.insertInto("devices")
				.values({
					mac_address: macAddress || mockMacAddress,
					name: `Unknown device with API ${apiKey.substring(0, 4)}...`,
					friendly_id: friendly_id,
					api_key: new_api_key,
					refresh_schedule: JSON.stringify({
						default_refresh_rate: 60,
						time_ranges: [],
					}),
					last_update_time: new Date().toISOString(),
					next_expected_update: new Date(
						Date.now() + 3600 * 1000,
					).toISOString(),
					timezone: "UTC",
					screen: DEFAULT_SCREEN,
				})
				.returningAll()
				.executeTakeFirst();

			if (newDevice) {
				logger.info(`Created new mock device: ${friendly_id}`);
				return newDevice as unknown as Device;
			}
		} catch (e) {
			logger.error("Error creating mock device", { error: e });
		}
	}

	return null;
};

// --- Response Builder ---

export const buildDisplayResponse = (
	imageUrl: string,
	filename: string,
	refreshRate: number,
	extra: Record<string, unknown> = {},
) => {
	return NextResponse.json(
		{
			status: 0,
			image_url: imageUrl,
			filename,
			refresh_rate: refreshRate,
			reset_firmware: false,
			update_firmware: false,
			firmware_url: null,
			special_function: "restart_playlist",
			...extra,
		},
		{ status: 200 },
	);
};

export const buildErrorResponse = (
	message: string,
	baseUrl: string,
	uniqueId: string,
) => {
	const notFoundImageUrl = `${baseUrl}/not-found.bmp`;
	return NextResponse.json(
		{
			status: 500,
			reset_firmware: true,
			message,
			image_url: notFoundImageUrl,
			filename: `not-found_${uniqueId}.bmp`,
		},
		{ status: 200 },
	);
};
