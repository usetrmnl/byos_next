import { withDeviceApiKey } from "@/lib/database/scoped-db";
import { checkDbConnection } from "@/lib/database/utils";

export interface RequestHeaders {
	apiKey: string | null;
	macAddress: string | null;
	refreshRate: string | null;
	batteryVoltage: string | null;
	fwVersion: string | null;
	rssi: string | null;
	width: number | null;
	height: number | null;
	model: string | null;
	specialFunction: boolean;
	base64: boolean;
	supportsTemperatureProfile: boolean;
	hostUrl: string;
}

export function parseRequestHeaders(request: Request): RequestHeaders {
	const headers = request.headers;
	const widthStr = headers.get("Width");
	const heightStr = headers.get("Height");

	return {
		apiKey: headers.get("Access-Token"),
		macAddress: headers.get("ID")?.toUpperCase() || null,
		refreshRate: headers.get("Refresh-Rate"),
		batteryVoltage: headers.get("Battery-Voltage"),
		fwVersion: headers.get("FW-Version"),
		rssi: headers.get("RSSI"),
		width: widthStr ? Number.parseInt(widthStr, 10) : null,
		height: heightStr ? Number.parseInt(heightStr, 10) : null,
		model: headers.get("Model")?.trim() || null,
		specialFunction: headers.get("Special-Function") === "true",
		base64: headers.get("BASE64") === "true",
		supportsTemperatureProfile: headers.get("temperature-profile") === "true",
		hostUrl:
			(headers.get("x-forwarded-proto") || "http") +
			"://" +
			(headers.get("x-forwarded-host") || headers.get("host") || "localhost"),
	};
}

export async function resolveUserIdFromApiKey(
	apiKey: string | null,
	options: { assumeDbReady?: boolean } = {},
): Promise<string | null> {
	if (!apiKey) return null;

	if (!options.assumeDbReady) {
		const { ready } = await checkDbConnection();
		if (!ready) return null;
	}

	const device = await withDeviceApiKey(apiKey, (scopedDb) =>
		scopedDb
			.selectFrom("devices")
			.select("user_id")
			.where("api_key", "=", apiKey)
			.executeTakeFirst(),
	);

	return device?.user_id ?? null;
}
