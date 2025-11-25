"use server";

import { createClient } from "@/lib/supabase/server";
import type { Device, RefreshSchedule } from "@/lib/supabase/types";
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
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized, cannot add test device");
		return { success: false, error: "Supabase client not initialized" };
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
				refresh_schedule: {
					default_refresh_rate: 60,
					time_ranges: [
						{ start_time: "00:00", end_time: "07:00", refresh_rate: 600 },
					],
				} as RefreshSchedule,
				timezone: timezone,
			};

			// Check if device with this friendly_id or mac_address already exists
			const { data: existingDevice } = await supabase
				.from("devices")
				.select("id")
				.eq("friendly_id", friendly_id)
				.or(`mac_address.eq.${mac_address.toUpperCase()}`)
				.single();

			if (existingDevice) {
				return {
					success: false,
					error: "Device with this friendly ID or MAC address already exists",
				};
			}

			// Create the test device
			const { error } = await supabase.from("devices").insert(testDevice);

			if (error) {
				console.error("Error creating test device:", error);
				return { success: false, error: error.message };
			}
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
		const { supabase, dbStatus } = await createClient();

		if (!dbStatus.ready || !supabase) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		const { error, count } = await supabase
			.from("system_logs")
			.delete({ count: "exact" })
			.neq("id", "0");

		if (error) {
			throw error;
		}

		return { success: true, count: count || undefined };
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
		const { supabase, dbStatus } = await createClient();

		if (!dbStatus.ready || !supabase) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		const { error, count } = await supabase
			.from("logs")
			.delete({ count: "exact" })
			.neq("id", 0);

		if (error) {
			throw error;
		}

		return { success: true, count: count || undefined };
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
		const { supabase, dbStatus } = await createClient();

		if (!dbStatus.ready || !supabase) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		// Check if a device with the same MAC address already exists
		const { data: existingDevices } = await supabase
			.from("devices")
			.select("id")
			.eq("mac_address", device.mac_address);

		if (existingDevices && existingDevices.length > 0) {
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
			refresh_schedule: {
				default_refresh_rate: 60,
				time_ranges: [],
			},
			battery_voltage: null,
			firmware_version: null,
			rssi: null,
		};

		// Insert the new device
		const { error } = await supabase.from("devices").insert(deviceToInsert);

		if (error) {
			throw error;
		}

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
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized, cannot delete device");
		return { success: false, error: "Supabase client not initialized" };
	}

	// First delete all logs associated with this device
	const { error: logsError } = await supabase
		.from("logs")
		.delete()
		.eq("device_id", id);

	if (logsError) {
		console.error("Error deleting device logs:", logsError);
		return { success: false, error: logsError.message };
	}

	// Then delete the device
	const { error } = await supabase.from("devices").delete().eq("id", id);

	if (error) {
		console.error("Error deleting device:", error);
		return { success: false, error: error.message };
	}

	return { success: true };
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
		const { supabase, dbStatus } = await createClient();

		if (!dbStatus.ready || !supabase) {
			return {
				success: false,
				error: "Database not ready. Please check your connection.",
			};
		}

		// Fix null values in devices table
		const { error } = await supabase.rpc("fix_devices_nulls");

		if (error) {
			throw error;
		}

		// For simplicity, we're not returning an actual count of fixed issues
		// In a real implementation, you might want to track this
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
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized, cannot fetch devices");
		return [];
	}

	const { data, error } = await supabase
		.from("devices")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching devices:", error);
		return [];
	}

	return data || [];
}
