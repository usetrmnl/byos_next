import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	rejectReadOnlyPluginSetting,
	requirePluginSettingsAccess,
} from "@/lib/trmnl/plugin-settings-store";

/**
 * DELETE /api/plugin_settings/{id}
 * Delete a plugin setting
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;
	const readOnly = rejectReadOnlyPluginSetting(access.setting);
	if (readOnly) return readOnly;

	await withExplicitUserScope(access.userId, (scopedDb) =>
		scopedDb
			.deleteFrom("plugin_settings")
			.where("id", "=", access.setting.id)
			.execute(),
	);

	return new Response(null, { status: 204 });
}
