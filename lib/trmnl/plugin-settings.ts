import type { Selectable } from "kysely";
import type { JsonObject, PluginSettings } from "@/lib/database/db.d";

export type PluginSettingRow = Selectable<PluginSettings>;

export function isJsonObject(value: unknown): value is JsonObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isNumericPluginSettingId(id: string): boolean {
	return /^\d+$/.test(id);
}

export function formatPluginSetting(row: PluginSettingRow) {
	return {
		id: Number(row.id),
		uuid: row.uuid,
		name: row.name,
		plugin_id: row.plugin_id,
		icon_url: row.icon_url,
		icon_content_type: row.icon_content_type,
		"read_only?": row.read_only,
		strategy: row.strategy,
	};
}

export function formatPluginSettingDetails(row: PluginSettingRow) {
	const markup =
		row.markup && typeof row.markup === "object" && !Array.isArray(row.markup)
			? row.markup
			: {};

	return {
		...formatPluginSetting(row),
		fields: row.fields,
		merge_variables: row.merge_variables,
		markup_sizes: Object.keys(markup),
		has_archive: Boolean(row.settings_yaml),
	};
}
