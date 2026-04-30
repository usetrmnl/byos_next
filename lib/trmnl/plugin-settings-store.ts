import type { Kysely } from "kysely";
import { getCurrentUserId } from "@/lib/auth/get-user";
import type { DB } from "@/lib/database/db.d";
import { checkDbConnection } from "@/lib/database/utils";
import {
	isNumericPluginSettingId,
	type PluginSettingRow,
} from "@/lib/trmnl/plugin-settings";

export async function requirePluginSettingsUser(): Promise<
	{ userId: string } | { response: Response }
> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return {
			response: Response.json(
				{ error: "Database unavailable" },
				{ status: 503 },
			),
		};
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return {
			response: Response.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	return { userId };
}

/**
 * Look up a plugin setting by its public id (BIGINT) or uuid (TEXT).
 *
 * Must be called inside `withExplicitUserScope` — RLS policies on
 * `plugin_settings` filter by `app.current_user_id`, so the row will only
 * be returned when it belongs to the scope's user. The route layer should
 * never re-add a `where("user_id", "=", ...)` clause; that's the bug RLS
 * is meant to make impossible.
 */
export async function findPluginSetting(
	scopedDb: Kysely<DB>,
	identifier: string,
): Promise<PluginSettingRow | undefined> {
	const query = scopedDb.selectFrom("plugin_settings").selectAll();

	return isNumericPluginSettingId(identifier)
		? query.where("id", "=", identifier).executeTakeFirst()
		: query.where("uuid", "=", identifier).executeTakeFirst();
}
