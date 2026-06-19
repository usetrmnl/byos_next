import { formatPluginSettingDetails } from "@/lib/trmnl/plugin-settings";
import { requirePluginSettingsAccess } from "@/lib/trmnl/plugin-settings-store";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	void request;
	const { id } = await params;
	const access = await requirePluginSettingsAccess(id);
	if (access.kind === "response") return access.response;

	return Response.json({ data: formatPluginSettingDetails(access.setting) });
}
