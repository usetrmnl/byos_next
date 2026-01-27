"use server";

import { db } from "@/lib/database/db";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import type { Device, Log } from "@/lib/types";

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
