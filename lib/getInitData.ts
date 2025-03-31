import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getHostUrl } from "@/utils/helpers";
import type { Device, SystemLog } from "@/lib/supabase/types";
import "server-only";

export type InitialData = {
	devices: Device[];
	systemLogs: SystemLog[];
	uniqueSources: string[];
	totalLogs: number;
	dbStatus: {
		ready: boolean;
		error?: string;
		PostgresUrl?: string;
	};
	hostUrl: string;
};

/**
 * Centralized cached function to get all initial application data.
 *
 * This function fetches and returns all necessary data for the application:
 * - Devices, logs, and other data from the database
 * - Status of the database connection
 * - Host URL and other environmental data
 *
 * The data is cached using React's cache() function, which means:
 * - Multiple calls to this function during the same request will be deduplicated
 * - The data can be shared across different components and pages
 * - Navigation between pages will not cause duplicate data fetching
 *
 * @returns Promise<InitialData> All the application's data
 */
export const getInitData = cache(async (): Promise<InitialData> => {
	const { supabase, dbStatus } = await createClient();
	const hostUrl = getHostUrl();

	// Default empty values if DB is not ready
	let devices: Device[] = [];
	let systemLogs: SystemLog[] = [];
	let uniqueSources: string[] = [];
	let totalLogs = 0;

	// Fetch data only if DB is ready
	if (dbStatus.ready && supabase) {
		try {
			const [devicesResult, logsResult, sourcesResult, logsCountResult] =
				await Promise.all([
					// Fetch devices
					supabase
						.from("devices")
						.select("*"),
					// Fetch recent logs
					supabase
						.from("system_logs")
						.select("*")
						.order("created_at", { ascending: false })
						.limit(50),
					// Fetch unique sources for filters
					supabase
						.from("system_logs")
						.select("source")
						.order("source"),
					// Get total logs count
					supabase
						.from("system_logs")
						.select("*", { count: "exact" })
						.limit(1),
				]);

			devices = devicesResult.data || [];
			systemLogs = logsResult.data || [];
			uniqueSources = Array.from(
				new Set(sourcesResult.data?.map((item) => item.source) || []),
			);
			totalLogs = logsCountResult.count || 0;
		} catch (error) {
			console.error("Error fetching initial data:", error);
		}
	}

	return {
		devices,
		systemLogs,
		uniqueSources,
		totalLogs,
		dbStatus,
		hostUrl,
	};
});

/**
 * Cached function to get just devices data.
 * This is an optimized subset of getInitData() that only returns device information.
 *
 * @returns Promise<Device[]> Array of devices
 */
export const getDevices = cache(async (): Promise<Device[]> => {
	// Re-use the full data fetch to maintain cache coherence
	const data = await getInitData();
	return data.devices;
});

/**
 * Preload function for the dashboard data.
 * Call this function in server components to start loading data
 * before it's actually needed, improving perceived performance.
 */
export function preloadDashboard() {
	// Use dynamic import to avoid the request context issue
	// This ensures the data fetch happens within a request context
	if (typeof window === "undefined") {
		// Only run on server-side
		void import("./getInitData")
			.then((module) => {
				void module.getInitData();
			})
			.catch((err) => {
				console.error("Failed to preload dashboard data:", err);
			});
	}
}

/**
 * Preload function for system logs data.
 * Call this function in server components to start loading data
 * before it's actually needed, improving perceived performance.
 */
export function preloadSystemLogs() {
	// Use dynamic import to avoid the request context issue
	if (typeof window === "undefined") {
		// Only run on server-side
		void import("./getInitData")
			.then((module) => {
				void module.getInitData();
			})
			.catch((err) => {
				console.error("Failed to preload system logs data:", err);
			});
	}
}

/**
 * Preload function for devices data.
 * Call this function in server components to start loading data
 * before it's actually needed, improving perceived performance.
 */
export function preloadDevices() {
	// Use dynamic import to avoid the request context issue
	if (typeof window === "undefined") {
		// Only run on server-side
		void import("./getInitData")
			.then((module) => {
				void module.getDevices();
			})
			.catch((err) => {
				console.error("Failed to preload devices data:", err);
			});
	}
}
