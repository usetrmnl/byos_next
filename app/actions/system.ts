"use server";

import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import type { SystemLog } from "@/lib/types";

type FetchSystemLogsParams = {
	page: number;
	perPage: number;
	search?: string;
	level?: string;
	source?: string;
};

type FetchSystemLogsResult = {
	logs: SystemLog[];
	total: number;
	uniqueSources: string[];
};

export async function fetchSystemLogs({
	page,
	perPage,
	search,
	level,
	source,
}: FetchSystemLogsParams): Promise<FetchSystemLogsResult> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { logs: [], total: 0, uniqueSources: [] };
	}

	// Calculate pagination
	const offset = (page - 1) * perPage;

	// Start building the query
	let query = db.selectFrom("system_logs").selectAll();

	// Apply filters
	if (level) {
		query = query.where("level", "=", level);
	}

	if (source) {
		query = query.where("source", "=", source);
	}

	if (search) {
		query = query.where((eb) =>
			eb.or([
				eb("message", "ilike", `%${search}%`),
				eb("metadata", "ilike", `%${search}%`),
			]),
		);
	}

	// Get paginated results
	const logs = await query
		.orderBy("created_at", "desc")
		.limit(perPage)
		.offset(offset)
		.execute();

	// Get total count
	let countQuery = db
		.selectFrom("system_logs")
		.select((eb) => eb.fn.countAll().as("count"));

	if (level) {
		countQuery = countQuery.where("level", "=", level);
	}

	if (source) {
		countQuery = countQuery.where("source", "=", source);
	}

	if (search) {
		countQuery = countQuery.where((eb) =>
			eb.or([
				eb("message", "ilike", `%${search}%`),
				eb("metadata", "ilike", `%${search}%`),
			]),
		);
	}

	const countResult = await countQuery.executeTakeFirst();

	// Get unique sources for the filter dropdown
	const uniqueSourcesResult = await db
		.selectFrom("system_logs")
		.select("source")
		.distinct()
		.orderBy("source", "asc")
		.execute();

	const uniqueSources = uniqueSourcesResult
		.map((item) => item.source)
		.filter(Boolean) as string[];

	return {
		logs: logs as unknown as SystemLog[],
		total: Number(countResult?.count || 0),
		uniqueSources,
	};
}

/**
 * Fetch system logs that contain device information in the metadata
 */
export type FetchDeviceSystemLogsParams = {
	page: number;
	perPage: number;
	search?: string;
	level?: string;
	source?: string;
	deviceId?: number;
	friendlyId?: string;
	macAddress?: string;
	apiKey?: string;
};

export async function fetchDeviceSystemLogs({
	page,
	perPage,
	search,
	level,
	source,
	deviceId,
	friendlyId,
	macAddress,
	apiKey,
}: FetchDeviceSystemLogsParams): Promise<FetchSystemLogsResult> {
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.warn("Database client not initialized");
		return { logs: [], total: 0, uniqueSources: [] };
	}

	// Calculate pagination
	const offset = (page - 1) * perPage;

	// Start building the query
	let query = db.selectFrom("system_logs").selectAll();

	// Apply filters
	if (level) {
		query = query.where("level", "=", level);
	}

	if (source) {
		query = query.where("source", "=", source);
	}

	query = query.where((eb) => {
		// We need to handle expression builder correctly
		const ors = [];

		if (search) {
			ors.push(eb("message", "ilike", `%${search}%`));
			ors.push(eb("metadata", "ilike", `%${search}%`));
		}

		if (deviceId) {
			ors.push(eb("metadata", "ilike", `%"device_id":${deviceId}%`));
			ors.push(eb("metadata", "ilike", `%"id":${deviceId}%`));
		}

		if (friendlyId) {
			ors.push(eb("metadata", "ilike", `%"friendly_id":"${friendlyId}"%`));
		}

		if (macAddress) {
			ors.push(eb("metadata", "ilike", `%"mac_address":"${macAddress}"%`));
		}

		if (apiKey) {
			ors.push(eb("metadata", "ilike", `%"api_key":"${apiKey}"%`));
		}

		if (ors.length > 0) {
			return eb.or(ors);
		}

		return eb.and([]); // No conditions added to this group if nothing matched
	});

	// Get paginated results
	const logs = await query
		.orderBy("created_at", "desc")
		.limit(perPage)
		.offset(offset)
		.execute();

	// Get total count
	let countQuery = db
		.selectFrom("system_logs")
		.select((eb) => eb.fn.countAll().as("count"));

	if (level) {
		countQuery = countQuery.where("level", "=", level);
	}

	if (source) {
		countQuery = countQuery.where("source", "=", source);
	}

	countQuery = countQuery.where((eb) => {
		const ors = [];

		if (search) {
			ors.push(eb("message", "ilike", `%${search}%`));
			ors.push(eb("metadata", "ilike", `%${search}%`));
		}

		if (deviceId) {
			ors.push(eb("metadata", "ilike", `%"device_id":${deviceId}%`));
			ors.push(eb("metadata", "ilike", `%"id":${deviceId}%`));
		}

		if (friendlyId) {
			ors.push(eb("metadata", "ilike", `%"friendly_id":"${friendlyId}"%`));
		}

		if (macAddress) {
			ors.push(eb("metadata", "ilike", `%"mac_address":"${macAddress}"%`));
		}

		if (apiKey) {
			ors.push(eb("metadata", "ilike", `%"api_key":"${apiKey}"%`));
		}

		if (ors.length > 0) {
			return eb.or(ors);
		}
		return eb.and([]);
	});

	const countResult = await countQuery.executeTakeFirst();

	// Get unique sources for the filter dropdown
	const uniqueSourcesResult = await db
		.selectFrom("system_logs")
		.select("source")
		.distinct()
		.orderBy("source", "asc")
		.execute();

	const uniqueSources = uniqueSourcesResult
		.map((item) => item.source)
		.filter(Boolean) as string[];

	return {
		logs: logs as unknown as SystemLog[],
		total: Number(countResult?.count || 0),
		uniqueSources,
	};
}
