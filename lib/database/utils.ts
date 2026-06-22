import { sql } from "kysely";
import { DbStatus } from "../types";
import { db } from "./db";
import { SQL_STATEMENTS } from "./sql-statements";

const REQUIRED_MIGRATIONS = Object.keys(SQL_STATEMENTS).filter(
	(name) => name !== "validate_schema",
);

/**
 * App and DB are required to stay in lockstep — a partial-migration deploy
 * means the app is making assumptions the DB can't enforce yet, so we want
 * a hard 503 across the board until migrations catch up. The validation
 * query is auto-generated from every `CREATE TABLE` in `migrations/`, so
 * adding a new table is a one-step change (write the migration, run
 * `pnpm generate:sql`).
 */
export async function checkDbConnection(): Promise<DbStatus> {
	try {
		await sql`SELECT 1`.execute(db);

		const result = await sql
			.raw(SQL_STATEMENTS.validate_schema.sql)
			.execute(db);

		if (result.rows.length > 0) {
			const missingTables = result.rows.map(
				(row) => (row as { missing_table: string }).missing_table,
			);
			throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
		}

		const migrations = await sql<{ name: string }>`
			SELECT name
			FROM schema_migrations
		`.execute(db);
		const applied = new Set(migrations.rows.map((row) => row.name));
		const pending = REQUIRED_MIGRATIONS.filter((name) => !applied.has(name));
		if (pending.length > 0) {
			throw new Error(`Pending database migrations: ${pending.join(", ")}`);
		}

		return {
			ready: true,
			databaseConfigured: Boolean(process.env.DATABASE_URL),
		};
	} catch (error) {
		return {
			ready: false,
			error: error instanceof Error ? error.message : String(error),
			databaseConfigured: Boolean(process.env.DATABASE_URL),
		};
	}
}

export async function getDbStatus(): Promise<DbStatus> {
	if (!process.env.DATABASE_URL) {
		return {
			ready: false,
			error: "ERROR_ENV_VAR_DATABASE_URL_NOT_SET",
			databaseConfigured: false,
		};
	}
	const status = await checkDbConnection();
	return status;
}
