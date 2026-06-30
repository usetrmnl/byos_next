/// <reference types="jest" />
import { mapDeviceRow } from "@/lib/database/mappers";

describe("mapDeviceRow", () => {
	it("serializes timestamp Date values from pg", () => {
		const lastUpdate = new Date("2026-06-30T09:05:48.931Z");
		const nextExpected = new Date("2026-06-30T09:06:48.931Z");

		const device = mapDeviceRow({
			id: 1,
			name: "Test device",
			mac_address: "AA:BB:CC:DD:EE:FF",
			api_key: "test-api-key",
			friendly_id: "CHKD0E",
			timezone: "UTC",
			last_update_time: lastUpdate,
			next_expected_update: nextExpected,
			display_mode: "screen",
		});

		expect(device.last_update_time).toBe(lastUpdate.toISOString());
		expect(device.next_expected_update).toBe(nextExpected.toISOString());
	});
});
