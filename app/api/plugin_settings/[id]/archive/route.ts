import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";
import { jsonError } from "@/lib/trmnl/plugin-settings-validation";

const MAX_ARCHIVE_BYTES = 256 * 1024;

/**
 * GET /api/plugin_settings/{id}/archive
 * Download a plugin setting archive
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

	return Response.json({
		data: { settings_yaml: setting.settings_yaml ?? "" },
	});
}

/**
 * POST /api/plugin_settings/{id}/archive
 * Upload a plugin setting archive
 *
 * Proxies to TRMNL API
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;

	const formData = await request.formData();
	const file = formData.get("file") ?? formData.get("archive");
	const settingsYaml =
		typeof file === "string"
			? file
			: file && "text" in file
				? await file.text()
				: "";

	const byteLength = Buffer.byteLength(settingsYaml, "utf8");
	if (byteLength > MAX_ARCHIVE_BYTES) {
		return jsonError(
			`settings_yaml exceeds ${MAX_ARCHIVE_BYTES} bytes (got ${byteLength})`,
		);
	}

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { kind: "not_found" } as const;

		const updated = await scopedDb
			.updateTable("plugin_settings")
			.set({
				settings_yaml: settingsYaml,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", setting.id)
			.returningAll()
			.executeTakeFirstOrThrow();

		return { kind: "ok", value: updated.settings_yaml ?? "" } as const;
	});

	if (result.kind === "not_found") {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ data: { settings_yaml: result.value } });
}
