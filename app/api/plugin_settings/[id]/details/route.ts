import { formatPluginSettingDetails } from "@/lib/trmnl/plugin-settings";
import {
	findPluginSettingForUser,
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
	const setting = await findPluginSettingForUser(id, auth.userId);
	if (!setting) {
		return Response.json({ error: "Not found" }, { status: 404 });
	}

	return Response.json({ data: formatPluginSettingDetails(setting) });
}
