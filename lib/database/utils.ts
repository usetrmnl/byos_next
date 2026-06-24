import { sql } from "kysely";
import { DbStatus } from "../types";
import { db } from "./db";
import { SQL_STATEMENTS } from "./sql-statements";

const REQUIRED_MIGRATIONS = Object.keys(SQL_STATEMENTS).filter(
	(name) => name !== "validate_schema",
);

const AUTH_ENABLED = process.env.AUTH_ENABLED !== "false";
const BYOS_MONO_USER_ID = "byos_mono_user";

export type DatabaseSetupStatus = {
	ready: boolean;
	error?: string;
	databaseConfigured: boolean;
	needsSetup: boolean;
	needsAdminBootstrap: boolean;
};

async function getMissingTables(): Promise<string[]> {
	const result = await sql.raw(SQL_STATEMENTS.validate_schema.sql).execute(db);

	return result.rows.map(
		(row) => (row as { missing_table: string }).missing_table,
	);
}

async function getPendingMigrations(
	schemaMigrationsExists: boolean,
): Promise<string[]> {
	if (!schemaMigrationsExists) {
		return REQUIRED_MIGRATIONS;
	}

	const migrations = await sql<{ name: string }>`
		SELECT name
		FROM schema_migrations
	`.execute(db);
	const applied = new Set(migrations.rows.map((row) => row.name));
	return REQUIRED_MIGRATIONS.filter((name) => !applied.has(name));
}

/**
 * Whether a real (non-mono) admin account exists. Only safe to call once
 * migrations are applied, since the `role` column ships in a later migration.
 */
async function adminUserExists(): Promise<boolean> {
	const result = await sql<{ exists: boolean }>`
		SELECT EXISTS (
			SELECT 1
			FROM "user"
			WHERE role = 'admin' AND id <> ${BYOS_MONO_USER_ID}
		) AS exists
	`.execute(db);
	return Boolean(result.rows[0]?.exists);
}

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

		const missingTables = await getMissingTables();
		if (missingTables.length > 0) {
			throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
		}

		const pendingMigrations = await getPendingMigrations(true);
		if (pendingMigrations.length > 0) {
			throw new Error(
				`Pending database migrations: ${pendingMigrations.join(", ")}`,
			);
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
	return checkDbConnection();
}

export async function getDatabaseSetupStatus(): Promise<DatabaseSetupStatus> {
	if (!process.env.DATABASE_URL) {
		return {
			ready: false,
			error: "ERROR_ENV_VAR_DATABASE_URL_NOT_SET",
			databaseConfigured: false,
			needsSetup: true,
			needsAdminBootstrap: false,
		};
	}

	try {
		await sql`SELECT 1`.execute(db);

		const missingTables = await getMissingTables();
		const schemaMigrationsExists = !missingTables.includes("schema_migrations");
		const pendingMigrations = await getPendingMigrations(
			schemaMigrationsExists,
		);
		const ready = missingTables.length === 0 && pendingMigrations.length === 0;

		// `ready` guarantees every migration ran, so the `role` column exists
		// before we probe for an admin. Bootstrapping is keyed on "no admin yet"
		// (not "no users yet") so a failed promotion self-heals on the next
		// sign-up instead of leaving the instance adminless.
		const needsAdminBootstrap =
			AUTH_ENABLED && ready && !(await adminUserExists());

		return {
			ready,
			error: ready
				? undefined
				: missingTables.length > 0
					? `Missing required tables: ${missingTables.join(", ")}`
					: `Pending database migrations: ${pendingMigrations.join(", ")}`,
			databaseConfigured: true,
			needsSetup: !ready || needsAdminBootstrap,
			needsAdminBootstrap,
		};
	} catch (error) {
		return {
			ready: false,
			error: error instanceof Error ? error.message : String(error),
			databaseConfigured: true,
			needsSetup: true,
			needsAdminBootstrap: false,
		};
	}
}
