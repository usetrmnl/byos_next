"use server";

import crypto from "crypto";
import { db } from "@/lib/database/db";
import { getCurrentUserId } from "@/lib/auth/get-user";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import type { Device, Log } from "@/lib/types";
import { generateFriendlyId } from "@/utils/helpers";

/**
 * Fetch a single device by friendly_id
 */
export async function fetchDeviceByFriendlyId(
	friendlyId: string,
): Promise<Device | null> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return null;
	}

	const device = await withUserScope((scopedDb) =>
		scopedDb
			.selectFrom("devices")
			.selectAll()
			.where("friendly_id", "=", friendlyId)
			.executeTakeFirst(),
	);

	if (!device) {
		return null;
	}

	return device as unknown as Device;
}

/**
 * Fetch logs for a specific device
 */
export async function fetchDeviceLogs(friendlyId: string): Promise<Log[]> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return [];
	}

	const logs = await db
		.selectFrom("logs")
		.selectAll()
		.where("friendly_id", "=", friendlyId)
		.orderBy("created_at", "desc")
		.limit(50)
		.execute();

	return logs as unknown as Log[];
}

/**
 * Fetch device logs with pagination and filtering
 */
export type FetchDeviceLogsParams = {
	page: number;
	perPage: number;
	search?: string;
	friendlyId?: string;
};

export type FetchDeviceLogsResult = {
	logs: Log[];
	total: number;
	uniqueTypes: string[];
};

export async function fetchDeviceLogsWithFilters({
	page,
	perPage,
	search,
	friendlyId,
}: FetchDeviceLogsParams): Promise<FetchDeviceLogsResult> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { logs: [], total: 0, uniqueTypes: [] };
	}

	// Calculate pagination
	const offset = (page - 1) * perPage;

	// Start building the query
	let query = db.selectFrom("logs").selectAll();

	if (friendlyId) {
		query = query.where("friendly_id", "=", friendlyId);
	}

	if (search) {
		query = query.where("log_data", "ilike", `%${search}%`);
	}

	// Get paginated results
	const logs = await query
		.orderBy("created_at", "desc")
		.limit(perPage)
		.offset(offset)
		.execute();

	// Get total count
	let countQuery = db
		.selectFrom("logs")
		.select((eb) => eb.fn.countAll().as("count"));

	if (friendlyId) {
		countQuery = countQuery.where("friendly_id", "=", friendlyId);
	}

	if (search) {
		countQuery = countQuery.where("log_data", "ilike", `%${search}%`);
	}

	const countResult = await countQuery.executeTakeFirst();

	// Get unique types for the filter dropdown
	// We need to fetch all relevant logs or perform a distinct query on the log_data content which might be hard with SQL only if it requires parsing
	// The original code fetched all logs (with pagination) and then computed uniqueTypes from the returned page.
	// Wait, the original code: `const { data: logs } = await query...` then `(logs || []).map...`
	// It only computed unique types from the *current page* of logs. That seems correct to replicate.

	const logsData = logs as unknown as Log[];

	const uniqueTypes = Array.from(
		new Set(
			logsData.map((log) => {
				const logData = log.log_data.toLowerCase();

				if (logData.includes("error") || logData.includes("fail")) {
					return "error";
				}
				if (logData.includes("warn")) {
					return "warning";
				}

				return "info";
			}),
		),
	);

	return {
		logs: logsData,
		total: Number(countResult?.count || 0),
		uniqueTypes,
	};
}

/**
 * Update a device
 */
export async function updateDevice(
	device: Partial<Device> & { id: number },
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { success: false, error: "Database client not initialized" };
	}

	// Prepare the update data
	// We construct object with optional properties explicitly
	const updateData: Record<string, unknown> = {};

	if (device.name !== undefined) updateData.name = device.name;
	if (device.mac_address !== undefined)
		updateData.mac_address = device.mac_address;
	if (device.api_key !== undefined) updateData.api_key = device.api_key;
	if (device.friendly_id !== undefined)
		updateData.friendly_id = device.friendly_id;
	if (device.timezone !== undefined) updateData.timezone = device.timezone;
	if (device.refresh_schedule !== undefined)
		updateData.refresh_schedule = device.refresh_schedule
			? JSON.stringify(device.refresh_schedule)
			: null;
	if (device.screen !== undefined) updateData.screen = device.screen;
	if (device.playlist_id !== undefined)
		updateData.playlist_id = device.playlist_id;
	if (device.mixup_id !== undefined) updateData.mixup_id = device.mixup_id;
	if (device.display_mode !== undefined)
		updateData.display_mode = device.display_mode;
	if (device.battery_voltage !== undefined)
		updateData.battery_voltage = device.battery_voltage;
	if (device.firmware_version !== undefined)
		updateData.firmware_version = device.firmware_version;
	if (device.rssi !== undefined) updateData.rssi = device.rssi;
	if (device.screen_width !== undefined)
		updateData.screen_width = device.screen_width;
	if (device.screen_height !== undefined)
		updateData.screen_height = device.screen_height;
	if (device.screen_orientation !== undefined)
		updateData.screen_orientation = device.screen_orientation;
	if (device.grayscale !== undefined) updateData.grayscale = device.grayscale;

	updateData.updated_at = new Date().toISOString();

	try {
		await withUserScope((scopedDb) =>
			scopedDb
				.updateTable("devices")
				.set(updateData)
				.where("id", "=", String(device.id))
				.execute(),
		);

		return { success: true };
	} catch (error) {
		console.error("Error updating device:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Add a new device for the current user.
 * Creates a device record with a placeholder MAC address that will be
 * replaced when the physical device connects via /api/setup.
 */
export async function addUserDevice(input: {
	apiKey: string;
	name?: string;
}): Promise<{
	success: boolean;
	apiKey?: string;
	friendlyId?: string;
	error?: string;
}> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database not available" };
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return { success: false, error: "You must be signed in to add a device" };
	}

	const apiKey = input.apiKey.trim();
	if (!apiKey || apiKey.length < 8) {
		return {
			success: false,
			error: "API key must be at least 8 characters",
		};
	}

	try {
		// Check uniqueness of API key (bypass RLS to check across all users)
		const existing = await db
			.selectFrom("devices")
			.select("id")
			.where("api_key", "=", apiKey)
			.executeTakeFirst();

		if (existing) {
			return { success: false, error: "A device with this API key already exists" };
		}

		// Generate a placeholder MAC from the API key (will be replaced on /api/setup)
		const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
		const mockMac = [
			hash.slice(0, 2),
			hash.slice(2, 4),
			hash.slice(4, 6),
			hash.slice(6, 8),
			hash.slice(8, 10),
			hash.slice(10, 12),
		]
			.join(":")
			.toUpperCase();

		const timestamp = new Date().toISOString().replace(/[-:Z]/g, "");
		const friendlyId = generateFriendlyId(mockMac, timestamp);
		const deviceName =
			input.name?.trim() || `TRMNL Device ${friendlyId}`;

		await withUserScope((scopedDb) =>
			scopedDb
				.insertInto("devices")
				.values({
					mac_address: mockMac,
					name: deviceName,
					friendly_id: friendlyId,
					api_key: apiKey,
					user_id: userId,
					refresh_schedule: JSON.stringify({
						default_refresh_rate: 60,
						time_ranges: [
							{
								start_time: "00:00",
								end_time: "07:00",
								refresh_rate: 3600,
							},
						],
					}),
					last_update_time: new Date().toISOString(),
					next_expected_update: new Date(
						Date.now() + 3600 * 1000,
					).toISOString(),
					timezone: "Europe/London",
				})
				.execute(),
		);

		return { success: true, apiKey, friendlyId };
	} catch (error) {
		console.error("Error adding device:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
