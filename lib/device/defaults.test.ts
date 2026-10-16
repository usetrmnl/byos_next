/// <reference types="jest" />
import { normalizeRefreshSchedule } from "@/lib/device/defaults";

describe("normalizeRefreshSchedule", () => {
	it("keeps numeric schedules as they are", () => {
		expect(
			normalizeRefreshSchedule({
				default_refresh_rate: 600,
				time_ranges: [
					{ start_time: "23:30", end_time: "06:30", refresh_rate: 6000 },
				],
			}),
		).toEqual({
			default_refresh_rate: 600,
			time_ranges: [
				{ start_time: "23:30", end_time: "06:30", refresh_rate: 6000 },
			],
		});
	});

	it("accepts refresh rates saved as numeric strings", () => {
		expect(
			normalizeRefreshSchedule({
				default_refresh_rate: "600",
				time_ranges: [
					{ start_time: "23:30", end_time: "06:30", refresh_rate: "6000" },
				],
			}),
		).toEqual({
			default_refresh_rate: 600,
			time_ranges: [
				{ start_time: "23:30", end_time: "06:30", refresh_rate: 6000 },
			],
		});
	});

	it("parses a JSON string column", () => {
		expect(normalizeRefreshSchedule('{"default_refresh_rate":"600"}')).toEqual({
			default_refresh_rate: 600,
			time_ranges: [],
		});
	});

	it("rejects a non-numeric default refresh rate", () => {
		expect(normalizeRefreshSchedule({ default_refresh_rate: "" })).toBeNull();
		expect(
			normalizeRefreshSchedule({ default_refresh_rate: "abc" }),
		).toBeNull();
		expect(normalizeRefreshSchedule({ default_refresh_rate: null })).toBeNull();
	});

	it("drops invalid time ranges but keeps the rest of the schedule", () => {
		expect(
			normalizeRefreshSchedule({
				default_refresh_rate: 600,
				time_ranges: [
					{ start_time: "23:30", end_time: "06:30", refresh_rate: "abc" },
					{ start_time: "12:00", end_time: "13:00", refresh_rate: 60 },
					null,
				],
			}),
		).toEqual({
			default_refresh_rate: 600,
			time_ranges: [
				{ start_time: "12:00", end_time: "13:00", refresh_rate: 60 },
			],
		});
	});
});
