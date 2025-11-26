import { sql } from "kysely";
import { db } from "./db";
import { SQL_STATEMENTS } from "./sql-statements";

export async function checkDbConnection(): Promise<{
	ready: boolean;
	error?: string;
	PostgresUrl?: string;
}> {
	try {
		await sql`SELECT 1`.execute(db);

		// Execute validation query - returns missing tables if any, empty if all exist
		const result = await sql
			.raw(SQL_STATEMENTS.validate_schema.sql)
			.execute(db);

		// If any rows returned, there are missing tables
		if (result.rows.length > 0) {
			const missingTables = result.rows.map(
				(row) => (row as { missing_table: string }).missing_table,
			);
			throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
		}

		return {
			ready: true,
			PostgresUrl: process.env.DATABASE_URL,
		};
	} catch (error) {
		return {
			ready: false,
			error: error instanceof Error ? error.message : String(error),
			PostgresUrl: process.env.DATABASE_URL,
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
