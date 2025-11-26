import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
	source?: string;
	metadata?: Record<string, unknown>;
	trace?: string;
}

export const log = async (
	level: LogLevel,
	message: string | Error,
	options: LogOptions = {},
) => {
	// Convert Error objects to strings if necessary
	const messageText = message instanceof Error ? message.message : message;
	const trace = message instanceof Error ? message.stack : options.trace;
	const { ready } = await checkDbConnection();

	if (!ready) {
		// Database client not initialized, cannot log, will output to console instead
		// but use better formatting for errors, and use coloring for stdout
		// and try to have proper spacing and be complete
		const color =
			level === "error"
				? "\x1b[31m"
				: level === "warn"
					? "\x1b[33m"
					: "\x1b[32m";
		const reset = "\x1b[0m";
		console.log(`${color}[${level.toUpperCase()}]${reset} ${messageText}`);
		if (trace) {
			console.log(`${color}[${level.toUpperCase()}]${reset} ${trace}`);
		}
		return;
	}

	// Always do console logging first
	switch (level) {
		case "info":
			console.log(messageText);
			break;
		case "warn":
			console.warn(messageText);
			break;
		case "error":
			console.error(messageText);
			break;
		case "debug":
			console.debug(messageText);
			break;
	}

	// Then log to database without awaiting
	(async () => {
		try {
			await db
				.insertInto("system_logs")
				.values({
					level,
					message: messageText,
					source: options.source || null,
					metadata: options.metadata ? JSON.stringify(options.metadata) : null,
					trace: trace || null,
				})
				.execute();
		} catch (err) {
			console.error("Error writing to system_logs:", err);
		}
	})();
};

// Convenience methods
export const logInfo = (message: string, options?: LogOptions) =>
	log("info", message, options);
export const logWarn = (message: string, options?: LogOptions) =>
	log("warn", message, options);
export const logError = (error: Error | string, options?: LogOptions) =>
	log("error", error, options);
export const logDebug = (message: string, options?: LogOptions) =>
	log("debug", message, options);

export type Log = {
	id: string;
	created_at: string;
	level: LogLevel;
	message: string;
	source?: string;
	metadata?: Record<string, unknown>;
	trace?: string;
	count?: number;
};

export const groupLogs = (logs: Log[]): Log[] => {
	if (!logs.length) return [];

	const groupedLogs: Log[] = [];
	let currentGroup: Log | null = null;

	const sortedLogs = [...logs].sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);

	for (const log of sortedLogs) {
		if (!currentGroup) {
			currentGroup = {
				...log,
				count: 1,
			};
			continue;
		}

		const currentTime = new Date(currentGroup.created_at).getTime();
		const logTime = new Date(log.created_at).getTime();
		const timeDiff = Math.abs(currentTime - logTime) / 1000;

		if (
			timeDiff <= 5 &&
			log.level === currentGroup.level &&
			log.source === currentGroup.source
		) {
			currentGroup.count = (currentGroup.count || 1) + 1;

			if (log.message !== currentGroup.message) {
				currentGroup.message = `${currentGroup.message} (+ ${currentGroup.count - 1} similar)`;
			}
		} else {
			groupedLogs.push(currentGroup);
			currentGroup = {
				...log,
				count: 1,
			};
		}
	}

	if (currentGroup) {
		groupedLogs.push(currentGroup);
	}

	return groupedLogs;
};

export const readLogs = async (
	options: {
		limit?: number;
		page?: number;
		levels?: LogLevel[];
		sources?: string[];
		search?: string;
		groupSimilar?: boolean;
	} = {},
): Promise<{ logs: Log[]; total: number }> => {
	const {
		limit = 100,
		page = 1,
		levels,
		sources,
		search,
		groupSimilar = true,
	} = options;
	const { ready } = await checkDbConnection();

	if (!ready) {
		console.error("Database client not initialized, cannot read logs");
		return { logs: [], total: 0 };
	}

	// Start building the query
	let query = db.selectFrom("system_logs").selectAll();

	// Apply filters
	if (levels && levels.length > 0) {
		query = query.where("level", "in", levels);
	}

	if (sources && sources.length > 0) {
		query = query.where("source", "in", sources);
	}

	if (search) {
		query = query.where((eb) =>
			eb.or([
				eb("message", "ilike", `%${search}%`),
				eb("source", "ilike", `%${search}%`),
			]),
		);
	}

	// Apply pagination
	const offset = (page - 1) * limit;

	// Execute the query for data
	const logsResult = await query
		.orderBy("created_at", "desc")
		.limit(limit)
		.offset(offset)
		.execute();

	// Get total count
	// For complex queries with filters, we need to re-apply filters for count
	// A cleaner way in Kysely is to use a CTE or just construct the count query separately
	// Here I'll just reconstruct the base query with filters for simplicity
	let countQuery = db
		.selectFrom("system_logs")
		.select((eb) => eb.fn.countAll().as("count"));

	if (levels && levels.length > 0) {
		countQuery = countQuery.where("level", "in", levels);
	}
	if (sources && sources.length > 0) {
		countQuery = countQuery.where("source", "in", sources);
	}
	if (search) {
		countQuery = countQuery.where((eb) =>
			eb.or([
				eb("message", "ilike", `%${search}%`),
				eb("source", "ilike", `%${search}%`),
			]),
		);
	}

	const countResult = await countQuery.executeTakeFirst();

	let logs = logsResult as unknown as Log[];

	// Apply grouping if requested
	if (groupSimilar && logs.length > 0) {
		logs = groupLogs(logs);
	}

	return {
		logs,
		total: Number(countResult?.count || 0),
	};
};
