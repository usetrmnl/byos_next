export type DeviceStatusStamp = {
	wifi_rssi_level?: number;
	wifi_status?: string;
	refresh_rate?: number;
	time_since_last_sleep_start?: number;
	current_fw_version?: string;
	special_function?: string;
	battery_voltage?: number;
	wakeup_reason?: string;
	free_heap_size?: number;
};

export type DeviceLogDisplayEntry = {
	deviceStatusStamp?: DeviceStatusStamp;
	message: string;
	codeline: number;
	sourcefile: string;
	timestamp: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim()) return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return undefined;
}

function numberValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function isoTimestamp(value: unknown, fallback?: string | null): string {
	const fallbackDate = fallback ? new Date(fallback) : new Date();
	const fallbackIso = Number.isNaN(fallbackDate.getTime())
		? new Date().toISOString()
		: fallbackDate.toISOString();

	if (typeof value === "string") {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? fallbackIso : date.toISOString();
	}

	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		const millis = value > 1_000_000_000_000 ? value : value * 1000;
		const date = new Date(millis);
		return Number.isNaN(date.getTime()) ? fallbackIso : date.toISOString();
	}

	return fallbackIso;
}

function normalizeEntry(
	entry: unknown,
	fallbackTimestamp?: string | null,
): DeviceLogDisplayEntry {
	if (!isRecord(entry)) {
		return {
			message: String(entry),
			codeline: 0,
			sourcefile: "device",
			timestamp: isoTimestamp(undefined, fallbackTimestamp),
		};
	}

	return {
		deviceStatusStamp: isRecord(entry.device_status_stamp)
			? (entry.device_status_stamp as DeviceStatusStamp)
			: undefined,
		message:
			stringValue(entry.log_message) ??
			stringValue(entry.message) ??
			stringValue(entry.level) ??
			"No message",
		codeline: numberValue(entry.log_codeline) ?? numberValue(entry.line) ?? 0,
		sourcefile:
			stringValue(entry.log_sourcefile) ??
			stringValue(entry.sourcefile) ??
			stringValue(entry.source) ??
			"device",
		timestamp: isoTimestamp(
			entry.timestamp ?? entry.creation_timestamp,
			fallbackTimestamp,
		),
	};
}

export function parseDeviceLogData(
	logData: string,
	fallbackTimestamp?: string | null,
): DeviceLogDisplayEntry[] {
	try {
		const parsed: unknown = JSON.parse(logData);
		if (Array.isArray(parsed)) {
			return parsed.map((entry) => normalizeEntry(entry, fallbackTimestamp));
		}
		if (isRecord(parsed)) {
			if (Array.isArray(parsed.logs_array)) {
				return parsed.logs_array.map((entry) =>
					normalizeEntry(entry, fallbackTimestamp),
				);
			}
			return [normalizeEntry(parsed, fallbackTimestamp)];
		}
		return [normalizeEntry(parsed, fallbackTimestamp)];
	} catch {
		return [normalizeEntry(logData, fallbackTimestamp)];
	}
}
