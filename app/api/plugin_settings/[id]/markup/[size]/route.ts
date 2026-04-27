import { db } from "@/lib/database/db";
import { isJsonObject } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSettingForUser,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

const VALID_MARKUP_SIZE = /^markup_[a-z0-9_-]+$/i;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string; size: string }> },
) {
	void request;
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id, size } = await params;
	if (!VALID_MARKUP_SIZE.test(size)) {
		return Response.json({ error: "Invalid size" }, { status: 422 });
	}

	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const markup = isJsonObject(setting.markup) ? setting.markup : {};
	return new Response(String(markup[size] ?? ""), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string; size: string }> },
) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id, size } = await params;
	if (!VALID_MARKUP_SIZE.test(size)) {
		return Response.json({ error: "Invalid size" }, { status: 422 });
	}

	const body = await request.json();
	if (typeof body.content !== "string") {
		return Response.json({ error: "content is required" }, { status: 422 });
	}

	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const markup = isJsonObject(setting.markup) ? setting.markup : {};
	await db
		.updateTable("plugin_settings")
		.set({
			markup: { ...markup, [size]: body.content },
			updated_at: new Date().toISOString(),
		})
		.where("id", "=", setting.id)
		.where("user_id", "=", auth.userId)
		.execute();

	return Response.json({ data: { size, content: body.content } });
}
