import crypto from "node:crypto";
import { db } from "@/lib/database/db";
import {
	formatPluginSetting,
	isNumericPluginSettingId,
} from "@/lib/trmnl/plugin-settings";
import { requirePluginSettingsUser } from "@/lib/trmnl/plugin-settings-store";

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
	let query = db
		.selectFrom("plugin_settings")
		.selectAll()
		.where("user_id", "=", auth.userId)
		.orderBy("created_at", "desc");

	if (pluginId && isNumericPluginSettingId(pluginId)) {
		query = query.where("plugin_id", "=", Number(pluginId));
	}

	const settings = await query.execute();
	return Response.json({ data: settings.map(formatPluginSetting) });
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

	const body = await request.json();
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

	const setting = await db
		.insertInto("plugin_settings")
		.values({
			uuid: crypto.randomUUID(),
			user_id: auth.userId,
			name,
			plugin_id: pluginId,
			strategy: typeof body.strategy === "string" ? body.strategy : "webhook",
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return Response.json({ data: formatPluginSetting(setting) });
}
