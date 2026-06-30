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
