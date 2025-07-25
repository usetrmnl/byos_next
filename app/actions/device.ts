"use server";

import { createClient } from "@/lib/supabase/server";
import type { Device, Log, RefreshSchedule } from "@/lib/supabase/types";

/**
 * Fetch a single device by friendly_id
 */
export async function fetchDeviceByFriendlyId(
	friendlyId: string,
): Promise<Device | null> {
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized");
		return null;
	}

	const { data, error } = await supabase
		.from("devices")
		.select("*")
		.eq("friendly_id", friendlyId)
		.single();

	if (error) {
		console.error("Error fetching device:", error);
		return null;
	}

	return data;
}

/**
 * Fetch logs for a specific device
 */
export async function fetchDeviceLogs(friendlyId: string): Promise<Log[]> {
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized");
		return [];
	}

	const { data, error } = await supabase
		.from("logs")
		.select("*")
		.eq("friendly_id", friendlyId)
		.order("created_at", { ascending: false })
		.limit(50);

	if (error) {
		console.error("Error fetching device logs:", error);
		return [];
	}

	return data || [];
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
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized");
		return { logs: [], total: 0, uniqueTypes: [] };
	}

	// Calculate pagination
	const from = (page - 1) * perPage;
	const to = from + perPage - 1;

	// Start building the query
	let query = supabase.from("logs").select("*", { count: "exact" });

	if (friendlyId) {
		query = query.eq("friendly_id", friendlyId);
	}

	if (search) {
		query = query.ilike("log_data", `%${search}%`);
	}

	// Get paginated results
	const {
		data: logs,
		count,
		error,
	} = await query.order("created_at", { ascending: false }).range(from, to);

	if (error) {
		console.error("Error fetching device logs:", error);

		// Check if it's a range error (page out of bounds)
		if (error.message.includes("range") || error.code === "22003") {
			// Return empty results with the correct count
			return {
				logs: [],
				total: count || 0,
				uniqueTypes: [],
			};
		}

		throw new Error("Failed to fetch device logs");
	}

	// Get unique types for the filter dropdown
	const uniqueTypes = Array.from(
		new Set(
			(logs || []).map((log) => {
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
		logs: logs || [],
		total: count || 0,
		uniqueTypes,
	};
}

/**
 * Update a device
 */
export async function updateDevice(
	device: Partial<Device> & { id: number },
): Promise<{ success: boolean; error?: string }> {
	const { supabase } = await createClient();

	if (!supabase) {
		console.warn("Supabase client not initialized");
		return { success: false, error: "Supabase client not initialized" };
	}

	// Prepare the update data
	const updateData: Partial<Device> = {
		name: device.name,
		mac_address: device.mac_address,
		api_key: device.api_key,
		friendly_id: device.friendly_id,
		timezone: device.timezone,
		refresh_schedule: device.refresh_schedule as RefreshSchedule,
		screen: device.screen,
		playlist_id: device.playlist_id,
		use_playlist: device.use_playlist,
		battery_voltage: device.battery_voltage,
		firmware_version: device.firmware_version,
		rssi: device.rssi,
		updated_at: new Date().toISOString(),
	};

	// Remove undefined values
	for (const key of Object.keys(updateData)) {
		if (updateData[key as keyof typeof updateData] === undefined) {
			delete updateData[key as keyof typeof updateData];
		}
	}

	const { error } = await supabase
		.from("devices")
		.update(updateData)
		.eq("id", device.id);

	if (error) {
		console.error("Error updating device:", error);
		return { success: false, error: error.message };
	}

	return { success: true };
}
