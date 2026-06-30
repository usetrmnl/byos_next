import { withDeviceApiKey } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";
import {
	type DeviceProfile,
	getDeviceProfile,
} from "@/lib/trmnl/device-profile";
import type { RequestHeaders } from "./request-headers";

export type DeviceProfileQuery = {
	modelName?: string | null;
	paletteId?: string | null;
};

export async function resolveDeviceProfileForRequest(
	headers: RequestHeaders,
	query: DeviceProfileQuery = {},
): Promise<DeviceProfile> {
	let modelName = query.modelName || headers.model;
	let paletteId: string | null = query.paletteId || null;

	if (headers.apiKey && !query.modelName) {
		const { ready } = await checkDbConnection();
		if (ready) {
			const device = await withDeviceApiKey(headers.apiKey, (scopedDb) =>
				scopedDb
					.selectFrom("devices")
					.select(["model", "palette_id"])
					.where("api_key", "=", headers.apiKey)
					.executeTakeFirst(),
			);

			modelName = device?.model ?? modelName;
			paletteId = query.paletteId ?? device?.palette_id ?? null;
		}
	}

	return getDeviceProfile(modelName, paletteId);
}

export async function resolveDeviceProfileOrNull(
	headers: RequestHeaders,
	query: DeviceProfileQuery = {},
): Promise<DeviceProfile | null> {
	try {
		return await resolveDeviceProfileForRequest(headers, query);
	} catch {
		return null;
	}
}
