import { sql } from "kysely";
import { getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "./db";

/**
 * The role used for application queries. This role must:
 * - Exist in the database (created by migration 0010)
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

	// Use a dedicated connection to ensure role and session variable persist
	return db.connection().execute(async (conn) => {
		// Switch to non-superuser role so RLS policies are enforced
		// (superusers bypass RLS even with FORCE ROW LEVEL SECURITY)
		await sql`SET ROLE ${sql.ref(APP_ROLE)}`.execute(conn);

		// Set the user context for RLS
		// Empty string when no user (auth disabled) = only access to unclaimed rows (user_id IS NULL)
		// User ID when authenticated = access to own rows + unclaimed rows
		await sql`SELECT set_config('app.current_user_id', ${userId ?? ""}, false)`.execute(
			conn,
		);

		return callback(conn);
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

	return db.transaction().execute(async (trx) => {
		// Switch to non-superuser role so RLS policies are enforced
		await sql`SET ROLE ${sql.ref(APP_ROLE)}`.execute(trx);

		// Set the user context for RLS within the transaction
		// is_local=true works correctly within transaction context
		await sql`SELECT set_config('app.current_user_id', ${userId ?? ""}, true)`.execute(
			trx,
		);

		return callback(trx);
	});
}
