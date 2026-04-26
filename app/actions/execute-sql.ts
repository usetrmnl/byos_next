"use server";

import { createHash } from "crypto";
import { sql as kyselySql } from "kysely";
import postgres from "postgres";
import { auth } from "@/lib/auth/auth";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import { SQL_STATEMENTS } from "@/lib/database/sql-statements";
import { checkDbConnection } from "@/lib/database/utils";

export type SqlExecutionStatus =
	| "idle"
	| "loading"
	| "success"
	| "error"
	| "warning";

export interface SqlExecutionResult {
	status: SqlExecutionStatus;
	result: Record<string, unknown>[];
	notices: Record<string, unknown>[];
	error?: string;
	executionTime?: number;
}

export type SqlExecutionState = {
	[key in keyof typeof SQL_STATEMENTS]: SqlExecutionResult;
};

const SCHEMA_MIGRATIONS_MIGRATION = "0012_create_schema_migrations";

function checksumSql(sql: string): string {
	return createHash("sha256").update(sql).digest("hex");
}

function migrationEntries() {
	return Object.entries(SQL_STATEMENTS).filter(
		([key]) => key !== "validate_schema" && key !== SCHEMA_MIGRATIONS_MIGRATION,
	);
}

async function authTablesExist(): Promise<boolean> {
	const result = await kyselySql<{
		count: string | number | bigint;
	}>`
		SELECT COUNT(*) AS count
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name IN ('user', 'session')
	`.execute(db);

	const count = Number(result.rows[0]?.count ?? 0);
	return count >= 2;
}

async function canRunSetupSql(): Promise<boolean> {
	if (!auth) {
		return true;
	}

	const user = await getCurrentUser().catch(() => null);
	if (user?.role === "admin") {
		return true;
	}

	const status = await checkDbConnection();
	if (!status.ready && status.error?.startsWith("Missing required tables:")) {
		// Fresh installs do not have auth tables yet, so setup must be runnable
		// before anyone can sign in. Once auth tables exist, require admin.
		return !(await authTablesExist().catch(() => false));
	}

	return false;
}

async function getAppliedMigrations(
	sql: postgres.Sql,
): Promise<Map<string, string>> {
	const rows = await sql<{ name: string; checksum: string }[]>`
		SELECT name, checksum
		FROM schema_migrations
	`;

	return new Map(rows.map((row) => [row.name, row.checksum]));
}

async function ensureMigrationLedger(
	sql: postgres.Sql,
	resultState: SqlExecutionState,
): Promise<void> {
	const statement = SQL_STATEMENTS[SCHEMA_MIGRATIONS_MIGRATION];
	const checksum = checksumSql(statement.sql);
	const startTime = performance.now();

	await sql.unsafe(statement.sql);

	const applied = await getAppliedMigrations(sql);
	const appliedChecksum = applied.get(SCHEMA_MIGRATIONS_MIGRATION);

	if (appliedChecksum && appliedChecksum !== checksum) {
		throw new Error(
			`Migration ${SCHEMA_MIGRATIONS_MIGRATION} was already applied with a different checksum`,
		);
	}

	if (!appliedChecksum) {
		await sql`
			INSERT INTO schema_migrations (name, checksum)
			VALUES (${SCHEMA_MIGRATIONS_MIGRATION}, ${checksum})
		`;
	}

	resultState[SCHEMA_MIGRATIONS_MIGRATION] = {
		status: "success",
		result: appliedChecksum
			? [{ skipped: true, reason: "Already applied" }]
			: [{ applied: true }],
		notices: [],
		executionTime: Math.round(performance.now() - startTime),
	};
}

export async function executeSqlStatements(): Promise<SqlExecutionState> {
	if (!(await canRunSetupSql())) {
		return Object.keys(SQL_STATEMENTS).reduce((acc, key) => {
			acc[key as keyof typeof SQL_STATEMENTS] = {
				status: "error",
				result: [],
				notices: [],
				error: "Unauthorized",
			};
			return acc;
		}, {} as SqlExecutionState);
	}

	const postgresUrl = process.env.DATABASE_URL;

	if (!postgresUrl) {
		// Return error state for all statements
		return Object.keys(SQL_STATEMENTS).reduce((acc, key) => {
			acc[key as keyof typeof SQL_STATEMENTS] = {
				status: "error",
				result: [],
				notices: [],
				error: "DATABASE_URL is not defined",
			};
			return acc;
		}, {} as SqlExecutionState);
	}

	// Transform DATABASE_URL to the correct format
	function transformPostgresUrl(url: string): string {
		try {
			const parsedUrl = new URL(url);
			const username = parsedUrl.username;
			const password = parsedUrl.password;
			return `postgresql://${username}:${password}@${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
		} catch (error) {
			console.error("Error transforming URL:", error);
			throw new Error("Invalid URL format");
		}
	}

	const connectionString = transformPostgresUrl(postgresUrl);

	// The client shows a local loading state while this server action runs.
	const resultState: SqlExecutionState = Object.keys(SQL_STATEMENTS).reduce(
		(acc, key) => {
			acc[key as keyof typeof SQL_STATEMENTS] = {
				status: "idle",
				result: [],
				notices: [],
			};
			return acc;
		},
		{} as SqlExecutionState,
	);

	const sql = postgres(connectionString, {
		ssl: connectionString.includes("sslmode=disable") ? false : "require",
		onnotice: () => {
			// We'll handle notices per query
		},
	});

	try {
		let migrationFailed: string | null = null;

		try {
			await ensureMigrationLedger(sql, resultState);
		} catch (error) {
			migrationFailed = SCHEMA_MIGRATIONS_MIGRATION;
			resultState[SCHEMA_MIGRATIONS_MIGRATION] = {
				status: "error",
				result: [],
				notices: [],
				error: error instanceof Error ? error.message : String(error),
			};
		}

		const entries = migrationFailed ? [] : migrationEntries();
		const applied = migrationFailed
			? new Map()
			: await getAppliedMigrations(sql);

		for (const [key, statement] of entries) {
			const notices: Record<string, unknown>[] = [];

			const sqlWithNotices = postgres(connectionString, {
				ssl: connectionString.includes("sslmode=disable") ? false : "require",
				onnotice: (notice) => {
					console.log(`Database notice for ${key}:`, notice);
					notices.push(notice);
				},
			});

			try {
				const checksum = checksumSql(statement.sql);
				const appliedChecksum = applied.get(key);
				if (appliedChecksum) {
					if (appliedChecksum !== checksum) {
						resultState[key as keyof typeof SQL_STATEMENTS] = {
							status: "error",
							result: [],
							notices,
							error: `Migration ${key} was already applied with a different checksum`,
						};
						migrationFailed = key;
						break;
					}

					resultState[key as keyof typeof SQL_STATEMENTS] = {
						status: "success",
						result: [{ skipped: true, reason: "Already applied" }],
						notices,
					};
					continue;
				}

				const startTime = performance.now();
				await sqlWithNotices.begin(async (trx) => {
					await trx.unsafe(statement.sql);
					await trx`
						INSERT INTO schema_migrations (name, checksum)
						VALUES (${key}, ${checksum})
					`;
				});
				const endTime = performance.now();

				resultState[key as keyof typeof SQL_STATEMENTS] = {
					status: "success",
					result: [{ applied: true }],
					notices,
					executionTime: Math.round(endTime - startTime),
				};
			} catch (error) {
				console.error(`Error executing SQL for ${key}:`, error);

				const errorMessage =
					error instanceof Error ? error.message : String(error);

				resultState[key as keyof typeof SQL_STATEMENTS] = {
					status: "error",
					result: [],
					notices,
					error: errorMessage,
				};

				migrationFailed = key;
				break;
			} finally {
				await sqlWithNotices.end();
			}
		}

		if (migrationFailed) {
			resultState.validate_schema = {
				status: "error",
				result: [],
				notices: [],
				error: `Skipped schema validation because migration ${migrationFailed} failed`,
			};
			return resultState;
		}

		const validationStartTime = performance.now();
		const validationResult = await sql.unsafe(
			SQL_STATEMENTS.validate_schema.sql,
		);
		resultState.validate_schema = {
			status: validationResult.length === 0 ? "success" : "error",
			result: validationResult,
			notices: [],
			error:
				validationResult.length === 0
					? undefined
					: "Schema validation found missing tables",
			executionTime: Math.round(performance.now() - validationStartTime),
		};
	} catch (error) {
		console.error("Unexpected error during SQL execution:", error);
		resultState.validate_schema = {
			status: "error",
			result: [],
			notices: [],
			error: error instanceof Error ? error.message : String(error),
		};
	} finally {
		// Close the main connection
		await sql.end();
	}

	return resultState;
}
