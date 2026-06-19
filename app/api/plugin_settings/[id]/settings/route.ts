import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
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
	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;
	const readOnly = rejectReadOnlyPluginSetting(access.setting);
	if (readOnly) return readOnly;

	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const fields = validateFields(body.fields);
	if (isResponse(fields)) return fields;

	const updated = await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.updateTable("plugin_settings")
			.set({
				fields: sql`COALESCE(fields, '{}'::jsonb) || ${JSON.stringify(fields)}::jsonb`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", access.setting.id)
			.returningAll()
			.executeTakeFirstOrThrow(),
	);

	return Response.json({ data: updated.fields });
}
