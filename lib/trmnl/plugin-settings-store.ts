import { getCurrentUserId } from "@/lib/auth/get-user";
import { db } from "@/lib/database/db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	isNumericPluginSettingId,
	type PluginSettingRow,
} from "@/lib/trmnl/plugin-settings";

export async function requirePluginSettingsUser(): Promise<
	{ userId: string } | { response: Response }
> {
	const { ready } = await checkDbConnection();
	if (!ready) {
		return {
			response: Response.json(
				{ error: "Database unavailable" },
				{ status: 503 },
			),
		};
	}

	const userId = await getCurrentUserId();
	if (!userId) {
		return {
			response: Response.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	return { userId };
}

export async function findPluginSettingForUser(
	identifier: string,
	userId: string,
): Promise<PluginSettingRow | undefined> {
	let query = db
		.selectFrom("plugin_settings")
		.selectAll()
		.where("user_id", "=", userId);

	query = isNumericPluginSettingId(identifier)
		? query.where("id", "=", identifier)
		: query.where("uuid", "=", identifier);

	return query.executeTakeFirst();
}
