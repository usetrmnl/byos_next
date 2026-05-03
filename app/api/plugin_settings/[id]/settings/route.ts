import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";
import {
	isResponse,
	parseJsonObjectBody,
	validateFields,
} from "@/lib/trmnl/plugin-settings-validation";

/**
 * PATCH /api/plugin_settings/{id}/settings
 *
 * Merges `body.fields` into the existing `fields` JSONB at the top level.
 * The merge is atomic via Postgres `||` so two concurrent PATCHes touching
 * different keys both win — the previous read-modify-write pattern lost
 * one of them.
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;

	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const fields = validateFields(body.fields);
	if (isResponse(fields)) return fields;

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { kind: "not_found" } as const;

		const updated = await scopedDb
			.updateTable("plugin_settings")
			.set({
				fields: sql`COALESCE(fields, '{}'::jsonb) || ${JSON.stringify(fields)}::jsonb`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", setting.id)
			.returningAll()
			.executeTakeFirstOrThrow();

		return { kind: "ok", value: updated.fields } as const;
	});

	if (result.kind === "not_found") {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ data: result.value });
}
