import { db } from "@/lib/database/db";
import { isJsonObject } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSettingForUser,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ plugin_setting_id: string }> },
) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { plugin_setting_id: id } = await params;
	const body = await request.json();
	if (!isJsonObject(body.fields)) {
		return Response.json(
			{ error: "fields must be a JSON object" },
			{ status: 422 },
		);
	}
	if (
		Object.values(body.fields).some(
			(value) => value !== null && typeof value !== "string",
		)
	) {
		return Response.json(
			{ error: "field values must be strings" },
			{ status: 422 },
		);
	}

	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const fields = isJsonObject(setting.fields) ? setting.fields : {};
	const updated = await db
		.updateTable("plugin_settings")
		.set({
			fields: { ...fields, ...body.fields },
			updated_at: new Date().toISOString(),
		})
		.where("id", "=", setting.id)
		.where("user_id", "=", auth.userId)
		.returningAll()
		.executeTakeFirstOrThrow();

	return Response.json({ data: updated.fields });
}
