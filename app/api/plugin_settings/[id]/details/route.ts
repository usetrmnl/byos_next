import { withExplicitUserScope } from "@/lib/database/scoped-db";
import { formatPluginSettingDetails } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSetting,
	requirePluginSettingsUser,
} from "@/lib/trmnl/plugin-settings-store";

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

	return Response.json({ data: formatPluginSettingDetails(setting) });
}
