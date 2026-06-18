import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
} from "@/lib/trmnl/plugin-settings-store";
import {
	isResponse,
	parseJsonObjectBody,
	validateMergeVariables,
} from "@/lib/trmnl/plugin-settings-validation";

/**
 * GET /api/plugin_settings/{id}/data
 *
 * UUID-based access works without a session (capability URL); numeric ids
 * still require session auth. See `requirePluginSettingsAccess`.
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;

	return Response.json({ data: access.setting.merge_variables });
}

/**
 * POST /api/plugin_settings/{id}/data
 * Replace `merge_variables` for a plugin setting.
 *
 * `merge_variables` is whole-replace by design (not a partial merge), so
 * concurrent POSTs to this endpoint are last-write-wins on the entire
 * object — that's the contract. The atomic UPDATE here just makes sure the
 * read_only check and the write happen on the same view of the row.
 */
export async function POST(
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

	const mergeVariables = validateMergeVariables(body.merge_variables);
	if (isResponse(mergeVariables)) return mergeVariables;

	const updated = await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.updateTable("plugin_settings")
			.set({
				merge_variables: sql`${JSON.stringify(mergeVariables)}::jsonb`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", access.setting.id)
			.returningAll()
			.executeTakeFirstOrThrow(),
	);

	return Response.json({ data: updated.merge_variables });
}
