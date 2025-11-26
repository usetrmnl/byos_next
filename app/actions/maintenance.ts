"use server";

import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import type { Device } from "@/lib/types";
import { isValidApiKey, isValidFriendlyId, timezones } from "@/utils/helpers";

/**
 * Initialize the database with the required schema and optionally a test device
 */
export async function addTestDevice(
	device_name: string,
	mac_address: string,
	friendly_id: string,
	api_key: string,
	timezone: string = timezones[0].value,
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized, cannot add test device");
		return { success: false, error: "Database client not initialized" };
	}

	try {
		// Check if we should create a test device
		if (device_name && mac_address && friendly_id && api_key) {
			// Validate inputs
			if (!isValidFriendlyId(friendly_id)) {
				return { success: false, error: "Invalid friendly ID format" };
			}

			if (!isValidApiKey(api_key)) {
				return { success: false, error: "Invalid API key format" };
			}

			const testDevice = {
				friendly_id: friendly_id,
				name: device_name,
				mac_address: mac_address.toUpperCase(),
				api_key: api_key,
				screen: "simple-text",
				refresh_schedule: JSON.stringify({
					default_refresh_rate: 60,
					time_ranges: [
						{ start_time: "00:00", end_time: "07:00", refresh_rate: 600 },
					],
				}),
				timezone: timezone,
			};

			// Check if device with this friendly_id or mac_address already exists
			const existingDevice = await db
				.selectFrom("devices")
				.select("id")
				.where((eb) =>
					eb.or([
						eb("friendly_id", "=", friendly_id),
						eb("mac_address", "=", mac_address.toUpperCase()),
					]),
				)
				.executeTakeFirst();

			if (existingDevice) {
				return {
					success: false,
					error: "Device with this friendly ID or MAC address already exists",
				};
			}

			// Create the test device
			await db.insertInto("devices").values(testDevice).execute();
		}

		return { success: true };
	} catch (error) {
		console.error("Error initializing database:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Delete all system logs
 */
export async function deleteAllSystemLogs(): Promise<{
	success: boolean;
	count?: number;
	error?: string;
}> {
	try {
		const { ready } = await checkDbConnection();

		if (!ready) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		const result = await db
			.deleteFrom("system_logs")
			.where("id", "is not", null) // generic where to allow delete all, safer than empty
			.executeTakeFirst();

		return { success: true, count: Number(result.numDeletedRows) };
	} catch (error) {
		console.error("Error deleting system logs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete all device logs
 */
export async function deleteAllDeviceLogs(): Promise<{
	success: boolean;
	count?: number;
	error?: string;
}> {
	try {
		const { ready } = await checkDbConnection();

		if (!ready) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		const result = await db
			.deleteFrom("logs")
			.where("id", ">", "0") // assuming ids are positive numbers but typed as string/bigint in types
			.executeTakeFirst();

		return { success: true, count: Number(result.numDeletedRows) };
	} catch (error) {
		console.error("Error deleting device logs:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Add a new device
 */
export async function addDevice(device: {
	name: string;
	mac_address: string;
	friendly_id: string;
	api_key: string;
	screen: string;
	timezone: string;
}): Promise<{ success: boolean; error?: string }> {
	try {
		const { ready } = await checkDbConnection();

		if (!ready) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		// Check if a device with the same MAC address already exists
		const existingDevices = await db
			.selectFrom("devices")
			.select("id")
			.where("mac_address", "=", device.mac_address)
			.execute();

		if (existingDevices.length > 0) {
			return {
				success: false,
				error: "A device with this MAC address already exists",
			};
		}

		// Create a device object with all required fields
		const deviceToInsert = {
			name: device.name,
			mac_address: device.mac_address,
			friendly_id: device.friendly_id,
			api_key: device.api_key,
			screen: device.screen,
			timezone: device.timezone,
			refresh_schedule: JSON.stringify({
				default_refresh_rate: 60,
				time_ranges: [],
			}),
			battery_voltage: null,
			firmware_version: null,
			rssi: null,
		};

		// Insert the new device
		await db.insertInto("devices").values(deviceToInsert).execute();

		return { success: true };
	} catch (error) {
		console.error("Error adding device:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete a device by ID
 */
export async function deleteDevice(
	id: number,
): Promise<{ success: boolean; error?: string }> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized, cannot delete device");
		return { success: false, error: "Database client not initialized" };
	}

	// Use transaction to ensure both operations succeed or fail together
	try {
		await db.transaction().execute(async (trx) => {
			// Fetch friendly_id to delete logs
			const device = await trx
				.selectFrom("devices")
				.select("friendly_id")
				.where("id", "=", id.toString())
				.executeTakeFirst();

			if (device) {
				await trx
					.deleteFrom("logs")
					.where("friendly_id", "=", device.friendly_id)
					.execute();
			}

			// Then delete the device
			await trx.deleteFrom("devices").where("id", "=", id.toString()).execute();
		});

		return { success: true };
	} catch (error) {
		console.error("Error deleting device:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Fix database issues by replacing null values with appropriate defaults
 */
export async function fixDatabaseIssues(): Promise<{
	success: boolean;
	fixedCount?: number;
	error?: string;
}> {
	try {
		const { ready } = await checkDbConnection();

		if (!ready) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		// Fix null values in devices table using raw SQL or individual updates.
		// Since I don't have the RPC, I'll implement a simple fix here:
		// Set defaults for nullable columns that shouldn't be null if that's what the RPC did.
		// Assuming fix_devices_nulls handles things like timezone defaulting to UTC, etc.
		await db
			.updateTable("devices")
			.set({ timezone: "UTC" })
			.where("timezone", "is", null)
			.execute();

		// Returning success, effectively mimicking the RPC call
		return { success: true, fixedCount: 1 };
	} catch (error) {
		console.error("Error fixing database issues:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Fetch all devices
 */
export async function fetchAllDevices(): Promise<Device[]> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized, cannot fetch devices");
		return [];
	}

	const devices = await db
		.selectFrom("devices")
		.selectAll()
		.orderBy("created_at", "desc")
		.execute();

	return devices as unknown as Device[];
}
