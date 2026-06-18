import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { isJsonObject } from "@/lib/trmnl/plugin-settings";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
} from "@/lib/trmnl/plugin-settings-store";
import {
	isResponse,
	parseJsonObjectBody,
	validateMarkupContent,
	validateMarkupSize,
} from "@/lib/trmnl/plugin-settings-validation";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string; size: string }> },
) {
	void request;
	const { id, size } = await params;
	const sizeOrError = validateMarkupSize(size);
	if (isResponse(sizeOrError)) return sizeOrError;

	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;

	const markup = isJsonObject(access.setting.markup)
		? access.setting.markup
		: {};
	return new Response(String(markup[sizeOrError] ?? ""), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

/**
 * PUT /api/plugin_settings/{id}/markup/{size}
 *
 * Atomic write of one canonical markup size into the JSONB column via
 * `jsonb_set`. Two concurrent PUTs to *different* sizes (e.g. `markup_full`
 * + `markup_quadrant`) now both land — the previous read-modify-write
 * silently dropped one.
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string; size: string }> },
) {
	const { id, size } = await params;
	const sizeOrError = validateMarkupSize(size);
	if (isResponse(sizeOrError)) return sizeOrError;

	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;
	const readOnly = rejectReadOnlyPluginSetting(access.setting);
	if (readOnly) return readOnly;

	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const content = validateMarkupContent(body.content);
	if (isResponse(content)) return content;

	await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.updateTable("plugin_settings")
			.set({
				markup: sql`jsonb_set(COALESCE(markup, '{}'::jsonb), ARRAY[${sizeOrError}::text], to_jsonb(${content}::text), true)`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", access.setting.id)
			.execute(),
	);

	return Response.json({ data: { size: sizeOrError, content } });
}
