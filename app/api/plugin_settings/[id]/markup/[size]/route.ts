import { sql } from "kysely";
import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { isJsonObject } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSetting,
	requirePluginSettingsUser,
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
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id, size } = await params;
	const sizeOrError = validateMarkupSize(size);
	if (isResponse(sizeOrError)) return sizeOrError;

	const setting = await withExplicitUserScope(auth.userId, (scopedDb) =>
		findPluginSetting(scopedDb, id),
	);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	const markup = isJsonObject(setting.markup) ? setting.markup : {};
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
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id, size } = await params;
	const sizeOrError = validateMarkupSize(size);
	if (isResponse(sizeOrError)) return sizeOrError;

	const body = await parseJsonObjectBody(request);
	if (isResponse(body)) return body;

	const content = validateMarkupContent(body.content);
	if (isResponse(content)) return content;

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { kind: "not_found" } as const;

		await scopedDb
			.updateTable("plugin_settings")
			.set({
				markup: sql`jsonb_set(COALESCE(markup, '{}'::jsonb), ARRAY[${sizeOrError}::text], to_jsonb(${content}::text), true)`,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", setting.id)
			.execute();

		return { kind: "ok" } as const;
	});

	if (result.kind === "not_found") {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ data: { size: sizeOrError, content } });
}
