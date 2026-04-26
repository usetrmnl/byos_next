import { db } from "@/lib/database/db";
import {
	findPluginSettingForUser,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

/**
 * GET /api/plugin_settings/{id}/archive
 * Download a plugin setting archive
 *
 * Proxies to TRMNL API
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;
	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({
		data: { settings_yaml: setting.settings_yaml ?? "" },
	});
}

/**
 * POST /api/plugin_settings/{id}/archive
 * Upload a plugin setting archive
 *
 * Proxies to TRMNL API
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;
	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const formData = await request.formData();
	const file = formData.get("file") ?? formData.get("archive");
	const settingsYaml =
		typeof file === "string"
			? file
			: file && "text" in file
				? await file.text()
				: "";

	const updated = await db
		.updateTable("plugin_settings")
		.set({
			settings_yaml: settingsYaml,
			updated_at: new Date().toISOString(),
		})
		.where("id", "=", setting.id)
		.where("user_id", "=", auth.userId)
		.returningAll()
		.executeTakeFirstOrThrow();

	return Response.json({
		data: { settings_yaml: updated.settings_yaml ?? "" },
	});
}
