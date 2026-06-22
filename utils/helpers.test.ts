import { DeviceDisplayMode } from "@/lib/mixup/constants";
import type { Device, Log } from "@/lib/types";
import {
	compareVersions,
	debounce,
	estimateBatteryLife,
	formatDate,
	formatTimezone,
	generateApiKey,
	generateFriendlyId,
	generateMockMacAddress,
	generateRandomApiKey,
	getDeviceStatus,
	getLogType,
	hashString,
	isValidApiKey,
	isValidFriendlyId,
} from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDevice(overrides: Partial<Device> = {}): Device {
	return {
		id: 1,
		name: "Test Device",
		mac_address: "AA:BB:CC:DD:EE:FF",
		api_key: "testApiKey12345678901",
		friendly_id: "ABC123",
		screen: null,
		refresh_schedule: null,
		timezone: "UTC",
		last_update_time: null,
		next_expected_update: null,
		last_refresh_duration: null,
		battery_voltage: null,
		firmware_version: null,
		rssi: null,
		created_at: null,
		updated_at: null,
		playlist_id: null,
		mixup_id: null,
		display_mode: DeviceDisplayMode.SCREEN,
		current_playlist_index: null,
		user_id: null,
		screen_width: null,
		screen_height: null,
		screen_orientation: null,
		grayscale: null,
		model: null,
		palette_id: null,
		sleep_mode_enabled: false,
		sleep_start_time: null,
		sleep_end_time: null,
		temperature_profile: "default",
		supports_temperature_profile: null,
		...overrides,
	};
}

function makeLog(log_data: string): Log {
	return { id: 1, friendly_id: "ABC123", log_data, created_at: null };
}

// ---------------------------------------------------------------------------
// compareVersions
// ---------------------------------------------------------------------------

describe("compareVersions", () => {
	it("returns 0 for equal versions", () => {
		expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
	});

	it("returns -1 when v1 < v2", () => {
		expect(compareVersions("1.2.3", "1.2.4")).toBe(-1);
		expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
		expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
	});

	it("returns 1 when v1 > v2", () => {
		expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
		expect(compareVersions("1.2.4", "1.2.3")).toBe(1);
	});

	it("strips leading 'v' prefix", () => {
		expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
		expect(compareVersions("V1.2.3", "v1.2.3")).toBe(0);
	});

	it("handles different part counts by treating missing parts as 0", () => {
		expect(compareVersions("1.0", "1.0.0")).toBe(0);
		expect(compareVersions("1.1", "1.1.1")).toBe(-1);
		expect(compareVersions("1.1.1", "1.1")).toBe(1);
	});

	it("handles non-numeric parts as 0", () => {
		expect(compareVersions("1.x.3", "1.0.3")).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
	const FIXED_NOW = new Date("2024-01-15T12:00:00.000Z").getTime();

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("returns 'Never' for null", () => {
		expect(formatDate(null)).toBe("Never");
	});

	it("shows seconds ago for recent past", () => {
		const date = new Date(FIXED_NOW - 30_000).toISOString();
		expect(formatDate(date)).toBe("30s ago");
	});

	it("shows minutes ago for < 1 hour", () => {
		const date = new Date(FIXED_NOW - 5 * 60_000).toISOString();
		expect(formatDate(date)).toBe("5m ago");
	});

	it("shows hours ago for < 24 hours", () => {
		const date = new Date(FIXED_NOW - 3 * 3_600_000).toISOString();
		expect(formatDate(date)).toBe("3h ago");
	});

	it("shows 'in X' prefix for future dates", () => {
		const date = new Date(FIXED_NOW + 45_000).toISOString();
		expect(formatDate(date)).toMatch(/^in \d+s$/);
	});

	it("shows date string for >= 7 days ago", () => {
		const date = new Date(FIXED_NOW - 8 * 86_400_000).toISOString();
		const result = formatDate(date);
		// Should contain month/day digits rather than a weekday
		expect(result).toBe("01/07, 07:00");
	});

	it("shows weekday format for 1-6 days ago", () => {
		const date = new Date(FIXED_NOW - 2 * 86_400_000).toISOString();
		const result = formatDate(date);
		// Weekday abbreviated like "Sat 07:00"
		expect(result).toBe("Sat 07:00");
	});
});

// ---------------------------------------------------------------------------
// getDeviceStatus
// ---------------------------------------------------------------------------

describe("getDeviceStatus", () => {
	const FIXED_NOW = new Date("2024-01-15T12:00:00.000Z").getTime();

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(FIXED_NOW);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("returns 'offline' when next_expected_update is null", () => {
		expect(getDeviceStatus(makeDevice())).toBe("offline");
	});

	it("returns 'online' when next_expected_update is in the future", () => {
		const device = makeDevice({
			next_expected_update: new Date(FIXED_NOW + 60_000).toISOString(),
		});
		expect(getDeviceStatus(device)).toBe("online");
	});

	it("returns 'offline' when next_expected_update is in the past", () => {
		const device = makeDevice({
			next_expected_update: new Date(FIXED_NOW - 60_000).toISOString(),
		});
		expect(getDeviceStatus(device)).toBe("offline");
	});

	it("returns 'offline' when next_expected_update equals now", () => {
		const device = makeDevice({
			next_expected_update: new Date(FIXED_NOW).toISOString(),
		});
		expect(getDeviceStatus(device)).toBe("offline");
	});
});

// ---------------------------------------------------------------------------
// getLogType
// ---------------------------------------------------------------------------

describe("getLogType", () => {
	it("returns 'error' for log containing 'error'", () => {
		expect(getLogType(makeLog("An error occurred"))).toBe("error");
	});

	it("returns 'error' for log containing 'fail'", () => {
		expect(getLogType(makeLog("Request failed"))).toBe("error");
	});

	it("is case-insensitive for error detection", () => {
		expect(getLogType(makeLog("ERROR: disk full"))).toBe("error");
		expect(getLogType(makeLog("FAILED to connect"))).toBe("error");
	});

	it("returns 'warning' for log containing 'warn'", () => {
		expect(getLogType(makeLog("Warning: low memory"))).toBe("warning");
		expect(getLogType(makeLog("WARN: retry limit"))).toBe("warning");
	});

	it("returns 'info' for normal log messages", () => {
		expect(getLogType(makeLog("Screen refreshed successfully"))).toBe("info");
		expect(getLogType(makeLog("Device connected"))).toBe("info");
	});

	it("prioritises 'error' over 'warn' when both are present", () => {
		expect(getLogType(makeLog("error warning combined"))).toBe("error");
	});
});

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe("debounce", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("does not call the function before the wait period", () => {
		const fn = jest.fn();
		const debounced = debounce(fn, 200);
		debounced();
		expect(fn).not.toHaveBeenCalled();
	});

	it("calls the function after the wait period", () => {
		const fn = jest.fn();
		const debounced = debounce(fn, 200);
		debounced();
		jest.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("only calls the function once when invoked multiple times rapidly", () => {
		const fn = jest.fn();
		const debounced = debounce(fn, 200);
		debounced();
		debounced();
		debounced();
		jest.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("resets the timer on each call", () => {
		const fn = jest.fn();
		const debounced = debounce(fn, 200);
		debounced();
		jest.advanceTimersByTime(100);
		debounced();
		jest.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
		jest.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("passes the latest arguments to the function", () => {
		const fn = jest.fn();
		const debounced = debounce(fn, 200);
		debounced("first");
		debounced("second");
		jest.advanceTimersByTime(200);
		expect(fn).toHaveBeenCalledWith("second");
	});
});

// ---------------------------------------------------------------------------
// isValidApiKey
// ---------------------------------------------------------------------------

describe("isValidApiKey", () => {
	it("accepts alphanumeric keys within 20-60 characters", () => {
		expect(isValidApiKey("a".repeat(20))).toBe(true);
		expect(isValidApiKey("aBcDeFgH12345678901234567890")).toBe(true);
		expect(isValidApiKey("a".repeat(60))).toBe(true);
	});

	it("rejects keys shorter than 20 characters", () => {
		expect(isValidApiKey("abc123")).toBe(false);
		expect(isValidApiKey("a".repeat(19))).toBe(false);
	});

	it("rejects keys longer than 60 characters", () => {
		expect(isValidApiKey("a".repeat(61))).toBe(false);
	});

	it("rejects keys with special characters", () => {
		expect(isValidApiKey(`${"a".repeat(19)}!`)).toBe(false);
		expect(isValidApiKey("valid-key-with-dashes123456")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isValidApiKey("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isValidFriendlyId
// ---------------------------------------------------------------------------

describe("isValidFriendlyId", () => {
	it("accepts exactly 6 uppercase alphanumeric characters", () => {
		expect(isValidFriendlyId("ABC123")).toBe(true);
		expect(isValidFriendlyId("ZZZZZZ")).toBe(true);
		expect(isValidFriendlyId("000000")).toBe(true);
	});

	it("rejects IDs that are not exactly 6 characters", () => {
		expect(isValidFriendlyId("ABC12")).toBe(false);
		expect(isValidFriendlyId("ABC1234")).toBe(false);
	});

	it("rejects lowercase characters", () => {
		expect(isValidFriendlyId("abc123")).toBe(false);
	});

	it("rejects special characters", () => {
		expect(isValidFriendlyId("ABC-12")).toBe(false);
	});

	it("rejects empty string", () => {
		expect(isValidFriendlyId("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// hashString
// ---------------------------------------------------------------------------

describe("hashString", () => {
	const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	it("returns a string of the requested length", () => {
		expect(hashString("input", "salt", 6, CHARSET)).toHaveLength(6);
		expect(hashString("input", "salt", 20, CHARSET)).toHaveLength(20);
	});

	it("is deterministic for the same inputs", () => {
		const a = hashString("test", "salt123", 10, CHARSET);
		const b = hashString("test", "salt123", 10, CHARSET);
		expect(a).toBe(b);
	});

	it("produces different output for different inputs", () => {
		const a = hashString("input1", "salt", 10, CHARSET);
		const b = hashString("input2", "salt", 10, CHARSET);
		expect(a).not.toBe(b);
	});

	it("produces different output for different salts", () => {
		const a = hashString("input", "salt1", 10, CHARSET);
		const b = hashString("input", "salt2", 10, CHARSET);
		expect(a).not.toBe(b);
	});

	it("only uses characters from the provided charset", () => {
		// Max safe length is 32 (sha256 hex digest = 64 chars, 2 per output char)
		const result = hashString("test", "salt", 32, CHARSET);
		for (const char of result) {
			expect(CHARSET).toContain(char);
		}
	});
});

// ---------------------------------------------------------------------------
// generateApiKey
// ---------------------------------------------------------------------------

describe("generateApiKey", () => {
	it("returns a 22-character string", () => {
		expect(generateApiKey("AA:BB:CC:DD:EE:FF")).toHaveLength(22);
	});

	it("is deterministic for the same MAC address", () => {
		const a = generateApiKey("AA:BB:CC:DD:EE:FF");
		const b = generateApiKey("AA:BB:CC:DD:EE:FF");
		expect(a).toBe(b);
	});

	it("normalises MAC address format (colons vs hyphens, case)", () => {
		const withColons = generateApiKey("aa:bb:cc:dd:ee:ff");
		const withHyphens = generateApiKey("AA-BB-CC-DD-EE-FF");
		const uppercase = generateApiKey("AA:BB:CC:DD:EE:FF");
		expect(withColons).toBe(withHyphens);
		expect(withColons).toBe(uppercase);
	});

	it("uses the provided salt", () => {
		const a = generateApiKey("AA:BB:CC:DD:EE:FF", "salt1");
		const b = generateApiKey("AA:BB:CC:DD:EE:FF", "salt2");
		expect(a).not.toBe(b);
	});

	it("only contains alphanumeric characters", () => {
		const key = generateApiKey("AA:BB:CC:DD:EE:FF");
		expect(key).toMatch(/^[a-zA-Z0-9]+$/);
	});
});

// ---------------------------------------------------------------------------
// generateMockMacAddress
// ---------------------------------------------------------------------------

describe("generateMockMacAddress", () => {
	it("returns a string in MAC address format", () => {
		const mac = generateMockMacAddress("someApiKey1234567890");
		expect(mac).toMatch(/^A1:B2:C3:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
	});

	it("is deterministic for the same API key", () => {
		const a = generateMockMacAddress("someApiKey1234567890");
		const b = generateMockMacAddress("someApiKey1234567890");
		expect(a).toBe(b);
	});

	it("produces different MACs for different API keys", () => {
		const a = generateMockMacAddress("keyOne");
		const b = generateMockMacAddress("keyTwo");
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// generateRandomApiKey
// ---------------------------------------------------------------------------

describe("generateRandomApiKey", () => {
	it("returns a 22-character string by default", () => {
		expect(generateRandomApiKey()).toHaveLength(22);
	});

	it("returns a string of the requested length", () => {
		expect(generateRandomApiKey(10)).toHaveLength(10);
		expect(generateRandomApiKey(40)).toHaveLength(40);
	});

	it("only contains alphanumeric characters", () => {
		expect(generateRandomApiKey()).toMatch(/^[a-zA-Z0-9]+$/);
	});

	it("produces different keys on successive calls", () => {
		const a = generateRandomApiKey();
		const b = generateRandomApiKey();
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// generateFriendlyId
// ---------------------------------------------------------------------------

describe("generateFriendlyId", () => {
	it("returns exactly 6 characters", () => {
		expect(generateFriendlyId("AA:BB:CC:DD:EE:FF")).toHaveLength(6);
	});

	it("is deterministic for the same MAC address", () => {
		const a = generateFriendlyId("AA:BB:CC:DD:EE:FF");
		const b = generateFriendlyId("AA:BB:CC:DD:EE:FF");
		expect(a).toBe(b);
	});

	it("only contains uppercase alphanumeric characters", () => {
		const id = generateFriendlyId("AA:BB:CC:DD:EE:FF");
		expect(id).toMatch(/^[A-Z0-9]{6}$/);
	});

	it("normalises MAC address format", () => {
		const withColons = generateFriendlyId("aa:bb:cc:dd:ee:ff");
		const withHyphens = generateFriendlyId("AA-BB-CC-DD-EE-FF");
		expect(withColons).toBe(withHyphens);
	});

	it("uses the provided salt", () => {
		const a = generateFriendlyId("AA:BB:CC:DD:EE:FF", "salt1");
		const b = generateFriendlyId("AA:BB:CC:DD:EE:FF", "salt2");
		expect(a).not.toBe(b);
	});
});

// ---------------------------------------------------------------------------
// formatTimezone
// ---------------------------------------------------------------------------

describe("formatTimezone", () => {
	it("returns the label for a known timezone", () => {
		expect(formatTimezone("America/New_York")).toBe("New York (EST/EDT)");
		expect(formatTimezone("Europe/London")).toBe("London (GMT/BST)");
		expect(formatTimezone("Asia/Tokyo")).toBe("Tokyo (JST)");
	});

	it("returns the raw value for an unknown timezone", () => {
		expect(formatTimezone("America/Unknown_City")).toBe("America/Unknown_City");
		expect(formatTimezone("UTC")).toBe("UTC");
	});
});

// ---------------------------------------------------------------------------
// estimateBatteryLife
// ---------------------------------------------------------------------------

describe("estimateBatteryLife", () => {
	it("returns 100% at max voltage (4.2V)", () => {
		const { batteryPercentage } = estimateBatteryLife(4.2, 10);
		expect(batteryPercentage).toBe(100);
	});

	it("returns 0% at min voltage (3.6V)", () => {
		const { batteryPercentage } = estimateBatteryLife(3.6, 10);
		expect(batteryPercentage).toBe(0);
	});

	it("returns ~50% at mid voltage (3.9V)", () => {
		const { batteryPercentage } = estimateBatteryLife(3.9, 10);
		expect(batteryPercentage).toBeCloseTo(50, 1);
	});

	it("clamps percentage to 0 below min voltage", () => {
		const { batteryPercentage } = estimateBatteryLife(3.0, 10);
		expect(batteryPercentage).toBe(0);
	});

	it("clamps percentage to 100 above max voltage (when not charging)", () => {
		const { batteryPercentage } = estimateBatteryLife(4.4, 10);
		expect(batteryPercentage).toBe(100);
	});

	it("sets isCharging = true when voltage > 4.6V", () => {
		expect(estimateBatteryLife(4.7, 10).isCharging).toBe(true);
	});

	it("sets isCharging = false when voltage <= 4.6V", () => {
		expect(estimateBatteryLife(4.6, 10).isCharging).toBe(false);
		expect(estimateBatteryLife(4.2, 10).isCharging).toBe(false);
	});

	it("returns positive remainingDays with a charged battery", () => {
		const { remainingDays } = estimateBatteryLife(4.2, 10);
		expect(remainingDays).toBeGreaterThan(0);
	});

	it("returns 0 remaining days at 0% battery", () => {
		const { remainingDays } = estimateBatteryLife(3.6, 10);
		expect(remainingDays).toBe(0);
	});

	it("uses the custom battery capacity", () => {
		const standard = estimateBatteryLife(4.0, 10, 1800);
		const upgraded = estimateBatteryLife(4.0, 10, 2500);
		expect(upgraded.remainingDays).toBeGreaterThan(standard.remainingDays);
	});
});
