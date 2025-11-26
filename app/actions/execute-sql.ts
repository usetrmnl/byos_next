"use server";

import postgres from "postgres";
import { SQL_STATEMENTS } from "@/lib/database/sql-statements";

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

// List of error messages that should be treated as warnings and allow execution to continue
const NON_FATAL_ERRORS = [
	"already exists",
	"relation already exists",
	"duplicate key value violates unique constraint",
];

export async function executeSqlStatements(): Promise<SqlExecutionState> {
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

	// Initialize result state with all statements in loading state
	const resultState: SqlExecutionState = Object.keys(SQL_STATEMENTS).reduce(
		(acc, key) => {
			acc[key as keyof typeof SQL_STATEMENTS] = {
				status: "loading",
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
		// Execute each statement in sequence
		for (const [key, statement] of Object.entries(SQL_STATEMENTS)) {
			const notices: Record<string, unknown>[] = [];

			// Create a new SQL client with notice handler for this specific query
			const sqlWithNotices = postgres(connectionString, {
				ssl: connectionString.includes("sslmode=disable") ? false : "require",
				onnotice: (notice) => {
					console.log(`Database notice for ${key}:`, notice);
					notices.push(notice);
				},
			});

			try {
				const startTime = performance.now();
				const result = await sqlWithNotices.unsafe(statement.sql);
				const endTime = performance.now();

				resultState[key as keyof typeof SQL_STATEMENTS] = {
					status: "success",
					result: result || [],
					notices,
					executionTime: Math.round(endTime - startTime),
				};
			} catch (error) {
				console.error(`Error executing SQL for ${key}:`, error);

				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// Check if this is a non-fatal error that should be treated as a warning
				const isNonFatalError = NON_FATAL_ERRORS.some((msg) =>
					errorMessage.toLowerCase().includes(msg.toLowerCase()),
				);

				resultState[key as keyof typeof SQL_STATEMENTS] = {
					status: isNonFatalError ? "warning" : "error",
					result: [],
					notices,
					error: errorMessage,
				};

				// Only stop execution on fatal errors
				if (!isNonFatalError) {
					break;
				}
				// For non-fatal errors, continue with the next statement
			} finally {
				// Close the connection for this query
				await sqlWithNotices.end();
			}
		}
	} catch (error) {
		console.error("Unexpected error during SQL execution:", error);
	} finally {
		// Close the main connection
		await sql.end();
	}

	return resultState;
}
