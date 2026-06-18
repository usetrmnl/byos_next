import type { Kysely } from "kysely";
import { getCurrentUserId } from "@/lib/auth/get-user";
import type { DB } from "@/lib/database/db.d";
import {
	withCapabilityUuid,
	withExplicitUserScope,
} from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	isNumericPluginSettingId,
	type PluginSettingRow,
} from "@/lib/trmnl/plugin-settings";

export type PluginSettingsAccess =
	| {
			kind: "ok";
			userId: string;
			setting: PluginSettingRow;
	  }
	| { kind: "response"; response: Response };

export function rejectReadOnlyPluginSetting(
	setting: Pick<PluginSettingRow, "read_only">,
): Response | null {
	return setting.read_only
		? Response.json(
				{ error: "Plugin setting cannot be modified" },
				{ status: 422 },
			)
		: null;
}

/**
 * Resolve a plugin-settings request to `{ userId, setting }` while honoring
 * the TRMNL auth contract:
 *
 *   - Numeric IDs (`/plugin_settings/123/...`) are user-facing identifiers
 *     and require a session user. RLS enforces ownership via byos_app.
 *
 *   - UUIDs are capability URLs (the secret IS the path). The handler may
 *     resolve them without a session — knowing the UUID is sufficient. We
 *     look up the row through the dedicated capability policy added in 0016
 *     and return the owning `user_id` so any mutation runs under that
 *     user's normal RLS scope.
 *
 * Routes never touch the bare `db` themselves — every read or write goes
 * through `withExplicitUserScope(access.userId, ...)`, so cross-tenant access
 * is a single-policy mistake away rather than a single-route mistake away.
 */
export async function requirePluginSettingsAccess(
	identifier: string,
): Promise<PluginSettingsAccess> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return {
			kind: "response",
			response: Response.json(
				{ error: "Database unavailable" },
				{ status: 503 },
			),
		};
	}

	if (isNumericPluginSettingId(identifier)) {
		const userId = await getCurrentUserId();
		if (!userId) {
			return {
				kind: "response",
				response: Response.json({ error: "Unauthorized" }, { status: 401 }),
			};
		}
		const setting = await withExplicitUserScope(userId, (scopedDb) =>
			scopedDb
				.selectFrom("plugin_settings")
				.selectAll()
				.where("id", "=", identifier)
				.executeTakeFirst(),
		);
		if (!setting) {
			return {
				kind: "response",
				response: Response.json({ error: "Not found" }, { status: 404 }),
			};
		}
		return { kind: "ok", userId, setting };
	}

	const setting = await withCapabilityUuid(identifier, (scopedDb) =>
		scopedDb
			.selectFrom("plugin_settings")
			.selectAll()
			.where("uuid", "=", identifier)
			.executeTakeFirst(),
	);
	if (!setting) {
		return {
			kind: "response",
			response: Response.json({ error: "Not found" }, { status: 404 }),
		};
	}
	return { kind: "ok", userId: setting.user_id, setting };
}

/**
 * Session-only authorization for routes that don't take a `{id}` (list, create).
 *
 * Returns the current user id or a 401 — capability URLs don't apply when no
 * UUID is present in the path.
 */
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
 * Look up a plugin setting by its public id (BIGINT) or uuid (TEXT) inside a
 * caller-provided `withExplicitUserScope`. Kept for the list route; per-row
 * routes go through `requirePluginSettingsAccess` instead so the
 * capability-URL semantics stay in one place.
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
