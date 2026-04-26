import { db } from "@/lib/database/db";
import {
	findPluginSettingForUser,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
	const image = formData.get("image") ?? formData.get("file");
	if (!image || typeof image === "string" || !("arrayBuffer" in image)) {
		return Response.json({ error: "image file is required" }, { status: 422 });
	}

	if (image.size > MAX_IMAGE_BYTES) {
		return Response.json({ error: "Image too large" }, { status: 422 });
	}

	const updated = await db
		.updateTable("plugin_settings")
		.set({
			icon_url: `local-plugin-setting://${setting.uuid}/${image.name}`,
			icon_content_type: image.type || "application/octet-stream",
			updated_at: new Date().toISOString(),
		})
		.where("id", "=", setting.id)
		.where("user_id", "=", auth.userId)
		.returningAll()
		.executeTakeFirstOrThrow();

	return Response.json({
		data: {
			message: "Image metadata stored locally",
			icon_url: updated.icon_url,
			icon_content_type: updated.icon_content_type,
		},
	});
}
