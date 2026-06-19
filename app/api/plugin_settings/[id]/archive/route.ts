import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
} from "@/lib/trmnl/plugin-settings-store";
import {
	jsonError,
	MAX_ARCHIVE_BYTES,
	rejectOversizedRequest,
} from "@/lib/trmnl/plugin-settings-validation";

/**
 * GET /api/plugin_settings/{id}/archive
 * Download a plugin setting archive.
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;

	return Response.json({
		data: { settings_yaml: access.setting.settings_yaml ?? "" },
	});
}

/**
 * POST /api/plugin_settings/{id}/archive
 * Upload a plugin setting archive.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	// Headers-stage reject so `formData()` can't be tricked into buffering an
	// oversized payload before we've authorized the request.
	const oversized = rejectOversizedRequest(request, MAX_ARCHIVE_BYTES);
	if (oversized) return oversized;

	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;
	const readOnly = rejectReadOnlyPluginSetting(access.setting);
	if (readOnly) return readOnly;

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

	const updated = await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.updateTable("plugin_settings")
			.set({
				settings_yaml: settingsYaml,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", access.setting.id)
			.returningAll()
			.executeTakeFirstOrThrow(),
	);

	return Response.json({
		data: { settings_yaml: updated.settings_yaml ?? "" },
	});
}
