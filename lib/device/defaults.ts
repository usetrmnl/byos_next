import type { RefreshSchedule } from "@/lib/types";

export const DEFAULT_DEVICE_SCREEN = "simple-text";

export const DEVICE_SETUP_REFRESH_SECONDS = 60;
export const DISPLAY_FALLBACK_REFRESH_SECONDS = 180;
export const DEVICE_SLEEP_REFRESH_SECONDS = 3600;
export const UI_REFRESH_FALLBACK_SECONDS = 300;

export const DEFAULT_DEVICE_TIMEZONE = "UTC";
export const DEFAULT_DEVICE_SLEEP_START = "00:00";
export const DEFAULT_DEVICE_SLEEP_END = "07:00";

export function createDefaultRefreshSchedule(): RefreshSchedule {
	return {
		default_refresh_rate: DEVICE_SETUP_REFRESH_SECONDS,
		time_ranges: [
			{
				start_time: DEFAULT_DEVICE_SLEEP_START,
				end_time: DEFAULT_DEVICE_SLEEP_END,
				refresh_rate: DEVICE_SLEEP_REFRESH_SECONDS,
			},
		],
	};
}

export function serializeRefreshSchedule(schedule: RefreshSchedule): string {
	return JSON.stringify(schedule);
}

// Older versions of the device form saved refresh rates as strings ("600"),
// so accept numeric strings as well as numbers.
function parseRefreshSeconds(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) {
		return Number.parseInt(value, 10);
	}
	return null;
}

export function normalizeRefreshSchedule(
	value: unknown,
): RefreshSchedule | null {
	if (!value) return null;
	if (typeof value === "string") {
		try {
			return normalizeRefreshSchedule(JSON.parse(value));
		} catch {
			return null;
		}
	}
	if (typeof value !== "object" || Array.isArray(value)) return null;
	const candidate = value as Record<string, unknown>;
	const defaultRefreshRate = parseRefreshSeconds(
		candidate.default_refresh_rate,
	);
	if (defaultRefreshRate === null) return null;
	const timeRanges: RefreshSchedule["time_ranges"] = [];
	if (Array.isArray(candidate.time_ranges)) {
		for (const range of candidate.time_ranges) {
			if (typeof range !== "object" || range === null) continue;
			const { start_time, end_time, refresh_rate } = range as Record<
				string,
				unknown
			>;
			const refreshRate = parseRefreshSeconds(refresh_rate);
			if (
				typeof start_time !== "string" ||
				typeof end_time !== "string" ||
				refreshRate === null
			) {
				continue;
			}
			timeRanges.push({ start_time, end_time, refresh_rate: refreshRate });
		}
	}
	return {
		default_refresh_rate: defaultRefreshRate,
		time_ranges: timeRanges,
	};
}
