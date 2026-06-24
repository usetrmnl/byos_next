"use server";

import { BYOS_MONO_USER_ID, getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import { withUserScope } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	createDefaultRefreshSchedule,
	DEFAULT_DEVICE_SCREEN,
	DEFAULT_DEVICE_TIMEZONE,
	DEVICE_SLEEP_REFRESH_SECONDS,
	serializeRefreshSchedule,
} from "@/lib/device/defaults";
import {
	hashClaimCode,
	normalizeClaimCode,
} from "@/lib/device/pending-device-claims";
import type { Device, Log } from "@/lib/types";
import { generateFriendlyId, generateMockMacAddress } from "@/utils/helpers";

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

	const visibleDeviceIds = await getVisibleDeviceFriendlyIds(friendlyId);
	if (visibleDeviceIds.length === 0) {
		return [];
	}

	const logs = await db
		.selectFrom("logs")
		.selectAll()
		.where("friendly_id", "in", visibleDeviceIds)
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
	type?: string;
	friendlyId?: string;
};

export type FetchDeviceLogsResult = {
	logs: Log[];
	total: number;
	uniqueTypes: string[];
};

async function getVisibleDeviceFriendlyIds(
	friendlyId?: string,
): Promise<string[]> {
	const devices = await withUserScope((scopedDb) => {
		let query = scopedDb.selectFrom("devices").select("friendly_id");
		if (friendlyId) {
			query = query.where("friendly_id", "=", friendlyId);
		}
		return query.execute();
	});

	return devices.map((device) => device.friendly_id);
}

export async function fetchDeviceLogsWithFilters({
	page,
	perPage,
	search,
	type,
	friendlyId,
}: FetchDeviceLogsParams): Promise<FetchDeviceLogsResult> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { logs: [], total: 0, uniqueTypes: [] };
	}

	// Calculate pagination
	const offset = (page - 1) * perPage;
	const visibleDeviceIds = await getVisibleDeviceFriendlyIds(friendlyId);

	if (visibleDeviceIds.length === 0) {
		return { logs: [], total: 0, uniqueTypes: [] };
	}

	// Start building the query
	let query = db
		.selectFrom("logs")
		.selectAll()
		.where("friendly_id", "in", visibleDeviceIds);

	if (search) {
		query = query.where("log_data", "ilike", `%${search}%`);
	}
	if (type && type !== "all") {
		if (type === "error") {
			query = query.where((eb) =>
				eb.or([
					eb("log_data", "ilike", "%error%"),
					eb("log_data", "ilike", "%fail%"),
				]),
			);
		} else if (type === "warning") {
			query = query.where("log_data", "ilike", "%warn%");
		} else if (type === "info") {
			query = query.where((eb) =>
				eb.and([
					eb.not(
						eb.or([
							eb("log_data", "ilike", "%error%"),
							eb("log_data", "ilike", "%fail%"),
						]),
					),
					eb.not(eb("log_data", "ilike", "%warn%")),
				]),
			);
		}
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
		.select((eb) => eb.fn.countAll().as("count"))
		.where("friendly_id", "in", visibleDeviceIds);

	if (search) {
		countQuery = countQuery.where("log_data", "ilike", `%${search}%`);
	}
	if (type && type !== "all") {
		if (type === "error") {
			countQuery = countQuery.where((eb) =>
				eb.or([
					eb("log_data", "ilike", "%error%"),
					eb("log_data", "ilike", "%fail%"),
				]),
			);
		} else if (type === "warning") {
			countQuery = countQuery.where("log_data", "ilike", "%warn%");
		} else if (type === "info") {
			countQuery = countQuery.where((eb) =>
				eb.and([
					eb.not(
						eb.or([
							eb("log_data", "ilike", "%error%"),
							eb("log_data", "ilike", "%fail%"),
						]),
					),
					eb.not(eb("log_data", "ilike", "%warn%")),
				]),
			);
		}
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
	if (device.model !== undefined) updateData.model = device.model || null;
	if (device.palette_id !== undefined)
		updateData.palette_id = device.palette_id || null;
	if (device.temperature_profile !== undefined)
		updateData.temperature_profile = device.temperature_profile;

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
			return {
				success: false,
				error: "A device with this API key already exists",
			};
		}

		// Generate a placeholder MAC from the API key (will be replaced on /api/setup)
		const mockMac = generateMockMacAddress(apiKey);

		const timestamp = new Date().toISOString().replace(/[-:Z]/g, "");
		const friendlyId = generateFriendlyId(mockMac, timestamp);
		const deviceName = input.name?.trim() || `TRMNL Device ${friendlyId}`;

		await withUserScope((scopedDb) =>
			scopedDb
				.insertInto("devices")
				.values({
					mac_address: mockMac,
					name: deviceName,
					friendly_id: friendlyId,
					api_key: apiKey,
					user_id: userId,
					refresh_schedule: serializeRefreshSchedule(
						createDefaultRefreshSchedule(),
					),
					last_update_time: new Date().toISOString(),
					next_expected_update: new Date(
						Date.now() + DEVICE_SLEEP_REFRESH_SECONDS * 1000,
					).toISOString(),
					timezone: DEFAULT_DEVICE_TIMEZONE,
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

/**
 * Claim a device that is showing a claim code on its /api/display screen.
 */
export async function claimDeviceByCode(input: {
	claimCode: string;
	name?: string;
}): Promise<{
	success: boolean;
	friendlyId?: string;
	error?: string;
}> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return { success: false, error: "Database not available" };
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return { success: false, error: "You must be signed in to claim a device" };
	}

	const normalizedClaimCode = normalizeClaimCode(input.claimCode);
	if (normalizedClaimCode.length !== 8) {
		return {
			success: false,
			error: "Claim code must be 8 characters",
		};
	}

	try {
		const claimHash = hashClaimCode(normalizedClaimCode);
		const claimed = await db.transaction().execute(async (trx) => {
			const pendingClaim = await trx
				.deleteFrom("pending_device_claims")
				.where("claim_hash", "=", claimHash)
				.returningAll()
				.executeTakeFirst();

			if (!pendingClaim) {
				throw new Error("Claim code was not found or has expired");
			}

			const existingDevice = await trx
				.selectFrom("devices")
				.selectAll()
				.where("api_key", "=", pendingClaim.api_key)
				.executeTakeFirst();

			if (
				existingDevice?.user_id &&
				existingDevice.user_id !== userId &&
				existingDevice.user_id !== BYOS_MONO_USER_ID
			) {
				throw new Error("This device has already been claimed");
			}

			const now = new Date();
			const deviceName = input.name?.trim();
			const macAddress =
				pendingClaim.mac_address ??
				generateMockMacAddress(pendingClaim.api_key);
			const timestamp = now.toISOString().replace(/[-:Z]/g, "");

			if (existingDevice) {
				const friendlyId = existingDevice.friendly_id;
				await trx
					.updateTable("devices")
					.set({
						user_id: userId,
						mac_address: macAddress,
						name: deviceName || existingDevice.name,
						screen: existingDevice.screen ?? DEFAULT_DEVICE_SCREEN,
						model: pendingClaim.model ?? existingDevice.model,
						updated_at: now.toISOString(),
					})
					.where("id", "=", existingDevice.id)
					.execute();
				return { friendlyId };
			}

			const friendlyId = generateFriendlyId(macAddress, timestamp);
			await trx
				.insertInto("devices")
				.values({
					mac_address: macAddress,
					name: deviceName || `TRMNL Device ${friendlyId}`,
					friendly_id: friendlyId,
					api_key: pendingClaim.api_key,
					user_id: userId,
					refresh_schedule: serializeRefreshSchedule(
						createDefaultRefreshSchedule(),
					),
					last_update_time: now.toISOString(),
					next_expected_update: new Date(
						now.getTime() + DEVICE_SLEEP_REFRESH_SECONDS * 1000,
					).toISOString(),
					timezone: DEFAULT_DEVICE_TIMEZONE,
					screen: DEFAULT_DEVICE_SCREEN,
					model: pendingClaim.model,
				})
				.execute();
			return { friendlyId };
		});

		return { success: true, friendlyId: claimed.friendlyId };
	} catch (error) {
		console.error("Error claiming device:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
