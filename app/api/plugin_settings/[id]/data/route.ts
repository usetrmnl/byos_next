import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";
import {
	isResponse,
	parseJsonObjectBody,
	validateMergeVariables,
} from "@/lib/trmnl/plugin-settings-validation";

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
	const setting = await withExplicitUserScope(auth.userId, (scopedDb) =>
		findPluginSetting(scopedDb, id),
	);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ data: setting.merge_variables });
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
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;
	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const mergeVariables = validateMergeVariables(body.merge_variables);
	if (isResponse(mergeVariables)) return mergeVariables;

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { kind: "not_found" } as const;
		if (setting.read_only) return { kind: "read_only" } as const;

		const updated = await scopedDb
			.updateTable("plugin_settings")
			.set({
				merge_variables: sql`${JSON.stringify(mergeVariables)}::jsonb`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", setting.id)
			.returningAll()
			.executeTakeFirstOrThrow();

		return { kind: "ok", value: updated.merge_variables } as const;
	});

	if (result.kind === "not_found") {
		return Response.json({ error: "Not found" }, { status: 404 });
	}
	if (result.kind === "read_only") {
		return Response.json({ error: "Data cannot be modified" }, { status: 422 });
	}

	return Response.json({ data: result.value });
}
