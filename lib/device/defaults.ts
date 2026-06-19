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
	const candidate = value as Partial<RefreshSchedule>;
	if (typeof candidate.default_refresh_rate !== "number") return null;
	const timeRanges = Array.isArray(candidate.time_ranges)
		? candidate.time_ranges.filter(
				(range): range is RefreshSchedule["time_ranges"][number] =>
					typeof range === "object" &&
					range !== null &&
					typeof range.start_time === "string" &&
					typeof range.end_time === "string" &&
					typeof range.refresh_rate === "number",
			)
		: [];
	return {
		default_refresh_rate: candidate.default_refresh_rate,
		time_ranges: timeRanges,
	};
}
