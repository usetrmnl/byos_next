const DEVICE_HEADER_NAMES = [
	"ID",
	"Access-Token",
	"Model",
	"Width",
	"Height",
	"Refresh-Rate",
	"Battery-Voltage",
	"FW-Version",
	"RSSI",
	"Special-Function",
	"BASE64",
	"temperature-profile",
] as const;

function maskSecret(value: string): string {
	if (value.length <= 8) return "****";
	return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Summarize TRMNL device request headers for system logs.
 * Secrets are masked; booleans make missing Access-Token obvious at a glance.
 */
export function summarizeDeviceRequest(request: Request) {
	const headers = request.headers;
	const accessToken = headers.get("Access-Token")?.trim() || null;

	return {
		macAddress: headers.get("ID")?.trim().toUpperCase() || null,
		hasApiKey: Boolean(accessToken),
		apiKeyPreview: accessToken ? maskSecret(accessToken) : null,
		model: headers.get("Model")?.trim() || null,
		width: headers.get("Width"),
		height: headers.get("Height"),
		refreshRate: headers.get("Refresh-Rate"),
		batteryVoltage: headers.get("Battery-Voltage"),
		fwVersion: headers.get("FW-Version"),
		rssi: headers.get("RSSI"),
		specialFunction: headers.get("Special-Function"),
		base64: headers.get("BASE64"),
		temperatureProfile: headers.get("temperature-profile"),
		receivedHeaders: DEVICE_HEADER_NAMES.filter((name) => headers.has(name)),
	};
}
