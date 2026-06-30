import { db } from "@/lib/database/db";
import {
	createDefaultRefreshSchedule,
	DEFAULT_DEVICE_SCREEN,
	DEFAULT_DEVICE_TIMEZONE,
	DEVICE_SETUP_REFRESH_SECONDS,
	serializeRefreshSchedule,
} from "./defaults";

export function buildProvisionedDeviceRow({
	macAddress,
	name,
	friendlyId,
	apiKey,
	userId,
	nextExpectedRefreshSeconds = DEVICE_SETUP_REFRESH_SECONDS,
	now = new Date(),
	screen = DEFAULT_DEVICE_SCREEN,
	model = null,
	batteryVoltage = null,
	firmwareVersion = null,
	rssi = null,
}: {
	macAddress: string;
	name: string;
	friendlyId: string;
	apiKey: string;
	userId: string;
	nextExpectedRefreshSeconds?: number;
	now?: Date;
	screen?: string | null;
	model?: string | null;
	batteryVoltage?: number | null;
	firmwareVersion?: string | null;
	rssi?: number | null;
}) {
	return {
		mac_address: macAddress,
		name,
		friendly_id: friendlyId,
		api_key: apiKey,
		refresh_schedule: serializeRefreshSchedule(createDefaultRefreshSchedule()),
		last_update_time: now.toISOString(),
		next_expected_update: new Date(
			now.getTime() + nextExpectedRefreshSeconds * 1000,
		).toISOString(),
		timezone: DEFAULT_DEVICE_TIMEZONE,
		screen,
		model,
		battery_voltage: batteryVoltage,
		firmware_version: firmwareVersion,
		rssi,
		user_id: userId,
	};
}

export async function createProvisionedDevice(
	scopedDb: typeof db,
	input: Parameters<typeof buildProvisionedDeviceRow>[0],
) {
	return scopedDb
		.insertInto("devices")
		.values(buildProvisionedDeviceRow(input))
		.returningAll()
		.executeTakeFirst();
}
