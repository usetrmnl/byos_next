import {
	DEFAULT_DEVICE_TIMEZONE,
	normalizeRefreshSchedule,
} from "@/lib/device/defaults";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import type { Device, TemperatureProfile } from "@/lib/types";

type DeviceRow = Record<string, unknown>;

function stringValue(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function booleanValue(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeDisplayMode(value: unknown): DeviceDisplayMode {
	return typeof value === "string" &&
		Object.values(DeviceDisplayMode).includes(value as DeviceDisplayMode)
		? (value as DeviceDisplayMode)
		: DeviceDisplayMode.SCREEN;
}

function normalizeTemperatureProfile(value: unknown): TemperatureProfile {
	return value === "a" || value === "b" || value === "c" || value === "default"
		? value
		: "default";
}

export function mapDeviceRow(row: DeviceRow): Device {
	return {
		id: Number(row.id ?? 0),
		name: stringValue(row.name),
		mac_address: stringValue(row.mac_address),
		api_key: stringValue(row.api_key),
		friendly_id: stringValue(row.friendly_id),
		screen: nullableString(row.screen),
		refresh_schedule: normalizeRefreshSchedule(row.refresh_schedule),
		timezone: stringValue(row.timezone, DEFAULT_DEVICE_TIMEZONE),
		last_update_time: nullableString(row.last_update_time),
		next_expected_update: nullableString(row.next_expected_update),
		last_refresh_duration: nullableNumber(row.last_refresh_duration),
		battery_voltage: nullableNumber(row.battery_voltage),
		firmware_version: nullableString(row.firmware_version),
		rssi: nullableNumber(row.rssi),
		created_at: nullableString(row.created_at),
		updated_at: nullableString(row.updated_at),
		playlist_id: nullableString(row.playlist_id),
		mixup_id: nullableString(row.mixup_id),
		display_mode: normalizeDisplayMode(row.display_mode),
		current_playlist_index: nullableNumber(row.current_playlist_index),
		user_id: nullableString(row.user_id),
		screen_width: nullableNumber(row.screen_width),
		screen_height: nullableNumber(row.screen_height),
		screen_orientation: nullableString(row.screen_orientation),
		model: nullableString(row.model),
		palette_id: nullableString(row.palette_id),
		sleep_mode_enabled: booleanValue(row.sleep_mode_enabled),
		sleep_start_time: nullableNumber(row.sleep_start_time),
		sleep_end_time: nullableNumber(row.sleep_end_time),
		temperature_profile: normalizeTemperatureProfile(row.temperature_profile),
		supports_temperature_profile:
			typeof row.supports_temperature_profile === "boolean"
				? row.supports_temperature_profile
				: null,
	};
}

export function mapDeviceRows(rows: DeviceRow[]): Device[] {
	return rows.map(mapDeviceRow);
}

export function mapTrmnlDeviceSummary(
	row: DeviceRow,
	options: { includeSleepMode?: boolean } = {},
) {
	const device = mapDeviceRow(row);
	const batteryVoltage = nullableNumber(device.battery_voltage);
	const percentCharged =
		batteryVoltage === null
			? null
			: Math.min(
					100,
					Math.max(0, ((batteryVoltage - 3.0) / (4.2 - 3.0)) * 100),
				);
	const wifiStrength =
		device.rssi === null
			? null
			: Math.min(100, Math.max(0, ((device.rssi + 100) / 70) * 100));

	const summary = {
		id: device.id,
		name: device.name,
		friendly_id: device.friendly_id,
		mac_address: device.mac_address,
		battery_voltage: batteryVoltage,
		rssi: device.rssi,
		percent_charged: percentCharged,
		wifi_strength: wifiStrength,
	};

	if (!options.includeSleepMode) {
		return summary;
	}

	return {
		...summary,
		sleep_mode_enabled: device.sleep_mode_enabled,
		sleep_start_time: device.sleep_start_time,
		sleep_end_time: device.sleep_end_time,
	};
}
