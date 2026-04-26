import { sql } from "kysely";
import { getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "./db";

/**
 * The role used for application queries. This role must:
 * - Exist in the database (created by migration 0009)
 * - NOT have BYPASSRLS attribute
 * - Have SELECT, INSERT, UPDATE, DELETE on all tables
 */
const APP_ROLE = "byos_app";

/**
 * Execute a database operation with user context for Row Level Security.
 *
 * This function:
 * 1. Gets the current user ID from the session
 * 2. Switches to a non-superuser role (byos_app) so RLS is enforced
 * 3. Sets the PostgreSQL session variable `app.current_user_id`
 * 4. Executes the callback with the scoped db connection
 * 5. RLS policies use this variable to filter data
 *
 * @example
 * ```ts
 * const devices = await withUserScope(async (db) => {
 *   return db.selectFrom("devices").selectAll().execute();
 * });
 * ```
 */
export async function withUserScope<T>(
	callback: (scopedDb: typeof db) => Promise<T>,
): Promise<T> {
	const userId = await getCurrentUserId();
	return runScoped(userId ?? "", callback);
}

/**
 * Execute a database operation scoped to a specific user ID for RLS.
 *
 * Use this when the user ID is known from context other than the HTTP session
 * (e.g. resolved from a device access token).
 */
export async function withExplicitUserScope<T>(
	userId: string,
	callback: (scopedDb: typeof db) => Promise<T>,
): Promise<T> {
	return runScoped(userId, callback);
}

/**
 * Acquire a pooled connection, switch role + set RLS user, run the callback,
 * then reset both settings before releasing the connection back to the pool.
 * Without the reset, `app.current_user_id` would persist on the connection and
 * any later unscoped query on that same pooled connection would inherit it.
 */
async function runScoped<T>(
	userId: string,
	callback: (scopedDb: typeof db) => Promise<T>,
): Promise<T> {
	return db.connection().execute(async (conn) => {
		await sql`SET ROLE ${sql.ref(APP_ROLE)}`.execute(conn);
		await sql`SELECT set_config('app.current_user_id', ${userId}, false)`.execute(
			conn,
		);
		try {
			return await callback(conn);
		} finally {
			// Best-effort cleanup: clear the RLS user and restore the default role
			// so the next checkout of this connection starts clean.
			try {
				await sql`SELECT set_config('app.current_user_id', '', false)`.execute(
					conn,
				);
				await sql`RESET ROLE`.execute(conn);
			} catch {
				// If reset fails (connection already broken), the pool will discard it.
			}
		}
	});
}

/**
 * Execute a database transaction with user context for Row Level Security.
 *
 * Same as withUserScope but wraps everything in a transaction.
 *
 * @example
 * ```ts
 * const result = await withUserScopeTransaction(async (trx) => {
 *   await trx.insertInto("playlists").values({ name: "My Playlist", user_id: userId }).execute();
 *   return trx.selectFrom("playlists").selectAll().execute();
 * });
 * ```
 */
export async function withUserScopeTransaction<T>(
	callback: (trx: typeof db) => Promise<T>,
): Promise<T> {
	const userId = await getCurrentUserId();

	return db.connection().execute(async (conn) => {
		await sql`SET ROLE ${sql.ref(APP_ROLE)}`.execute(conn);
		try {
			return await conn.transaction().execute(async (trx) => {
				// Set the user context for RLS within the transaction.
				// is_local=true clears the setting automatically at transaction end.
				await sql`SELECT set_config('app.current_user_id', ${userId ?? ""}, true)`.execute(
					trx,
				);

				return await callback(trx);
			});
		} finally {
			// SET ROLE is session-level, so reset it before releasing the pooled
			// connection even when the transaction commits successfully.
			try {
				await sql`RESET ROLE`.execute(conn);
			} catch {
				// If reset fails (connection already broken), the pool will discard it.
			}
		}
	});
}
