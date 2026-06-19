import crypto from "node:crypto";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	formatPluginSetting,
	isNumericPluginSettingId,
} from "@/lib/trmnl/plugin-settings";
import { requirePluginSettingsUser } from "@/lib/trmnl/plugin-settings-store";
import {
	isResponse,
	parseJsonObjectBody,
	parsePaginationParams,
} from "@/lib/trmnl/plugin-settings-validation";

/**
 * GET /api/plugin_settings
 * List my plugin settings
 *
 * Proxies to TRMNL API
 */
export async function GET(request: Request) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { searchParams } = new URL(request.url);
	const pluginId = searchParams.get("plugin_id");
	const { limit, offset } = parsePaginationParams(searchParams);

	const settings = await withExplicitUserScope(
		auth.userId,
		async (scopedDb) => {
			let query = scopedDb
				.selectFrom("plugin_settings")
				.selectAll()
				.orderBy("created_at", "desc")
				.orderBy("id", "desc")
				.limit(limit)
				.offset(offset);

			if (pluginId && isNumericPluginSettingId(pluginId)) {
				query = query.where("plugin_id", "=", Number(pluginId));
			}

			return query.execute();
		},
	);

	return Response.json({
		data: settings.map(formatPluginSetting),
		meta: { page: Math.floor(offset / limit) + 1, page_size: limit },
	});
}

/**
 * POST /api/plugin_settings
 * Create a new plugin setting
 *
 * Proxies to TRMNL API
 */
export async function POST(request: Request) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const name = typeof body.name === "string" ? body.name.trim() : "";
	const pluginId =
		typeof body.plugin_id === "number"
			? body.plugin_id
			: Number.parseInt(String(body.plugin_id ?? ""), 10);

	if (!name || !Number.isFinite(pluginId)) {
		return Response.json(
			{ error: "name and plugin_id are required" },
			{ status: 422 },
		);
	}

	const setting = await withExplicitUserScope(auth.userId, (scopedDb) =>
		scopedDb
			.insertInto("plugin_settings")
			.values({
				uuid: crypto.randomUUID(),
				user_id: auth.userId,
				name,
				plugin_id: pluginId,
				strategy: typeof body.strategy === "string" ? body.strategy : "webhook",
			})
			.returningAll()
			.executeTakeFirstOrThrow(),
	);

	return Response.json({ data: formatPluginSetting(setting) });
}
