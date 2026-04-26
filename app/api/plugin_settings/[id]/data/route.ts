import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import { isJsonObject } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSettingByUuid,
	findPluginSettingForUser,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

/**
 * GET /api/plugin_settings/{id}/data
 * Get the data of a plugin setting
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

	return Response.json({ data: setting.merge_variables });
}

/**
 * POST /api/plugin_settings/{id}/data
 * Update data for a plugin setting
 *
 * Proxies to TRMNL API
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await request.json();
	if (!isJsonObject(body.merge_variables)) {
		return Response.json(
			{ error: "merge_variables must be a JSON object" },
			{ status: 422 },
		);
	}

	const { ready } = await checkDbConnection();
	if (!ready) {
		return Response.json({ error: "Database unavailable" }, { status: 503 });
	}

	const setting = await findPluginSettingByUuid(id);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}
	if (setting.read_only) {
		return Response.json({ error: "Data cannot be modified" }, { status: 422 });
	}

	const updated = await db
		.updateTable("plugin_settings")
		.set({
			merge_variables: body.merge_variables,
			updated_at: new Date().toISOString(),
		})
		.where("uuid", "=", id)
		.returningAll()
		.executeTakeFirstOrThrow();

	return Response.json({ data: updated.merge_variables });
}
