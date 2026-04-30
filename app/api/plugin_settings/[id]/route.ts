import { withExplicitUserScope } from "@/lib/database/scoped-db";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

/**
 * DELETE /api/plugin_settings/{id}
 * Delete a plugin setting
 *
 * Proxies to TRMNL API
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const auth = await requirePluginSettingsUser();
	if ("response" in auth) return auth.response;

	const { id } = await params;

	const result = await withExplicitUserScope(auth.userId, async (scopedDb) => {
		const setting = await findPluginSetting(scopedDb, id);
		if (!setting) return { found: false } as const;

		await scopedDb
			.deleteFrom("plugin_settings")
			.where("id", "=", setting.id)
			.execute();

		return { found: true } as const;
	});

	if (!result.found) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return new Response(null, { status: 204 });
}
