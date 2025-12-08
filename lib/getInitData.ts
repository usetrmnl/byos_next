import { cache } from "react";
import { db } from "@/lib/database/db";
import { getDbStatus } from "@/lib/database/utils";
import type {
	Device,
	Mixup,
	Playlist,
	PlaylistItem,
	SystemLog,
} from "@/lib/types";
import "server-only";

export type InitialData = {
	devices: Device[];
	playlists: Playlist[];
	playlistItems: PlaylistItem[];
	mixups: Mixup[];
	systemLogs: SystemLog[];
	uniqueSources: string[];
	totalLogs: number;
	dbStatus: {
		ready: boolean;
		error?: string;
		PostgresUrl?: string;
	};
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
	const dbStatus = await getDbStatus();

	// Default empty values if DB is not ready
	let devices: Device[] = [];
	let systemLogs: SystemLog[] = [];
	let uniqueSources: string[] = [];
	let totalLogs = 0;
	let playlists: Playlist[] = [];
	let playlistItems: PlaylistItem[] = [];
	let mixups: Mixup[] = [];

	// Fetch data only if DB is ready
	if (dbStatus.ready) {
		try {
			const [
				devicesResult,
				playlistsResult,
				playlistItemsResult,
				mixupsResult,
				logsResult,
				sourcesResult,
				logsCountResult,
			] = await Promise.all([
				// Fetch devices
				db
					.selectFrom("devices")
					.selectAll()
					.execute(),
				// Fetch playlists
				db
					.selectFrom("playlists")
					.selectAll()
					.execute(),
				// Fetch playlist items
				db
					.selectFrom("playlist_items")
					.selectAll()
					.execute(),
				// Fetch mixups
				db
					.selectFrom("mixups")
					.selectAll()
					.orderBy("created_at", "desc")
					.execute(),
				// Fetch recent logs
				db
					.selectFrom("system_logs")
					.selectAll()
					.orderBy("created_at", "desc")
					.limit(50)
					.execute(),
				// Fetch unique sources for filters
				db
					.selectFrom("system_logs")
					.select("source")
					.distinct()
					.orderBy("source")
					.execute(),
				// Get total logs count
				db
					.selectFrom("system_logs")
					.select((eb) => eb.fn.countAll().as("count"))
					.executeTakeFirst(),
			]);

			devices = devicesResult as unknown as Device[];
			playlists = playlistsResult as unknown as Playlist[];
			playlistItems = playlistItemsResult as unknown as PlaylistItem[];
			mixups = mixupsResult as unknown as Mixup[];
			systemLogs = logsResult as unknown as SystemLog[];
			uniqueSources = Array.from(
				new Set(
					sourcesResult.map((item) => item.source).filter(Boolean) as string[],
				),
			);
			totalLogs = Number(logsCountResult?.count || 0);
		} catch (error) {
			console.error("Error fetching initial data:", error);
		}
	}

	return {
		devices,
		playlists,
		playlistItems,
		mixups,
		systemLogs,
		uniqueSources,
		totalLogs,
		dbStatus,
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
	void getInitData();
}

/**
 * Preload function for system logs data.
 * Call this function in server components to start loading data
 * before it's actually needed, improving perceived performance.
 */
export function preloadSystemLogs() {
	void getInitData();
}

/**
 * Preload function for devices data.
 * Call this function in server components to start loading data
 * before it's actually needed, improving perceived performance.
 */
export function preloadDevices() {
	void getDevices();
}
