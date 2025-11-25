import { sql } from "kysely";
import { db } from "./db";

export async function checkDbConnection(): Promise<{
	ready: boolean;
	error?: string;
	PostgresUrl?: string;
}> {
	try {
		await sql`SELECT 1`.execute(db);
		return {
			ready: true,
		};
	} catch (error) {
		console.error("Database connection check failed:", error);
		return {
			ready: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export async function getDbStatus() {
	if (!process.env.DATABASE_URL) {
		return {
			ready: false,
			error: "ERROR_ENV_VAR_DATABASE_URL_NOT_SET",
		};
	}
	const status = await checkDbConnection();
	return status;
}
