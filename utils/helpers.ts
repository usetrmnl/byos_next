import type { Device, Log } from "@/lib/supabase/types";
import crypto from "crypto";

import { networkInterfaces } from "os";

export function getLocalIPAddresses() {
	const nets = networkInterfaces();
	const results: { [key: string]: string[] } = Object.create(null);

	for (const name of Object.keys(nets)) {
		for (const net of nets[name] || []) {
			const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
			if (net.family === familyV4Value && !net.internal) {
				if (!results[name]) {
					results[name] = [];
				}
				results[name].push(net.address);
			}
		}
	}

	// Return the first found non-internal IPv4 address
	return results[Object.keys(results)[0]]?.[0] || "No IP found";
}

export function getHostUrl() {
	return process.env.NODE_ENV === "production"
		? process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: `http://${getLocalIPAddresses()}:${process.env.PORT || 3000}`
		: `http://${getLocalIPAddresses()}:${process.env.PORT || 3000}`;
}

// Format date to a readable format
export function formatDate(dateString: string | null): string {
	if (!dateString) return "Never";

	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMsAbs = Math.abs(diffMs);
	const diffSecs = Math.floor(diffMsAbs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	let timeText = "";
	if (diffSecs < 60) {
		timeText = `${diffSecs}s`;
	} else if (diffMins < 60) {
		timeText = `${diffMins}m`;
	} else if (diffHours < 24) {
		timeText = `${diffHours}h`;
	} else if (diffDays < 7) {
		const options: Intl.DateTimeFormatOptions = {
			weekday: "short",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		};
		timeText = date.toLocaleString("en-US", options);
	} else {
		timeText = date.toLocaleString("en-US", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	}

	return diffMs < 0 ? `in ${timeText}` : `${timeText} ago`;
}

// Determine device status based on next expected update time
export function getDeviceStatus(device: Device): "online" | "offline" {
	if (!device.next_expected_update) return "offline";

	const nextExpectedUpdate = new Date(device.next_expected_update);
	const now = new Date();

	// Device is offline if current time is past the next expected update time
	return now < nextExpectedUpdate ? "online" : "offline";
}

// Parse log data to determine log type
export function getLogType(log: Log): "error" | "warning" | "info" {
	const logData = log.log_data.toLowerCase();

	if (logData.includes("error") || logData.includes("fail")) return "error";
	if (logData.includes("warn")) return "warning";

	return "info";
}

// Custom debounce function implementation
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Add validation functions for API key and friendly ID
export const isValidApiKey = (key: string): boolean => {
	const regex = /^[a-zA-Z0-9]{20,60}$/; // Alphanumeric, 20-60 characters
	return regex.test(key);
};

export const isValidFriendlyId = (id: string): boolean => {
	const regex = /^[A-Z0-9]{6}$/; // 6 uppercase alphanumeric characters
	return regex.test(id);
};

// Add the new hashing and generation functions with types
export function hashString(
	input: string,
	salt: string,
	length: number,
	charset: string,
): string {
	const hash = crypto.createHmac("sha256", salt).update(input).digest("hex");
	let result = "";
	for (let i = 0; i < length; i++) {
		result +=
			charset[
				Number.parseInt(hash.slice(i * 2, i * 2 + 2), 16) % charset.length
			];
	}
	return result;
}

export function generateApiKey(macAddress: string, salt?: string): string {
	const normalizedMacAddress = macAddress.toUpperCase().replace(/[:-]/g, ""); // Normalize MAC
	const characters =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return hashString(
		normalizedMacAddress,
		salt || "API_KEY_SALT",
		22,
		characters,
	);
}

export function generateFriendlyId(macAddress: string, salt?: string): string {
	const normalizedMacAddress = macAddress.toUpperCase().replace(/[:-]/g, ""); // Normalize MAC
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return hashString(
		normalizedMacAddress,
		salt || "FRIENDLY_ID_SALT",
		6,
		characters,
	);
}

// Common IANA timezones grouped by region
export const timezones = [
	// Europe
	{ value: "Europe/London", label: "London (GMT/BST)", region: "Europe" },
	{ value: "Europe/Paris", label: "Paris (CET/CEST)", region: "Europe" },
	{ value: "Europe/Berlin", label: "Berlin (CET/CEST)", region: "Europe" },
	{ value: "Europe/Madrid", label: "Madrid (CET/CEST)", region: "Europe" },
	{ value: "Europe/Rome", label: "Rome (CET/CEST)", region: "Europe" },
	{
		value: "Europe/Amsterdam",
		label: "Amsterdam (CET/CEST)",
		region: "Europe",
	},
	{ value: "Europe/Athens", label: "Athens (EET/EEST)", region: "Europe" },
	{ value: "Europe/Moscow", label: "Moscow (MSK)", region: "Europe" },

	// North America
	{
		value: "America/New_York",
		label: "New York (EST/EDT)",
		region: "North America",
	},
	{
		value: "America/Chicago",
		label: "Chicago (CST/CDT)",
		region: "North America",
	},
	{
		value: "America/Denver",
		label: "Denver (MST/MDT)",
		region: "North America",
	},
	{
		value: "America/Los_Angeles",
		label: "Los Angeles (PST/PDT)",
		region: "North America",
	},
	{
		value: "America/Toronto",
		label: "Toronto (EST/EDT)",
		region: "North America",
	},
	{
		value: "America/Vancouver",
		label: "Vancouver (PST/PDT)",
		region: "North America",
	},

	// Asia
	{ value: "Asia/Tokyo", label: "Tokyo (JST)", region: "Asia" },
	{ value: "Asia/Shanghai", label: "Shanghai (CST)", region: "Asia" },
	{ value: "Asia/Singapore", label: "Singapore (SGT)", region: "Asia" },
	{ value: "Asia/Dubai", label: "Dubai (GST)", region: "Asia" },
	{ value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", region: "Asia" },

	// Australia & Pacific
	{
		value: "Australia/Sydney",
		label: "Sydney (AEST/AEDT)",
		region: "Australia & Pacific",
	},
	{
		value: "Australia/Melbourne",
		label: "Melbourne (AEST/AEDT)",
		region: "Australia & Pacific",
	},
	{
		value: "Australia/Perth",
		label: "Perth (AWST)",
		region: "Australia & Pacific",
	},
	{
		value: "Pacific/Auckland",
		label: "Auckland (NZST/NZDT)",
		region: "Australia & Pacific",
	},
];

// Format timezone for display
export const formatTimezone = (timezone: string): string => {
	const found = timezones.find((tz) => tz.value === timezone);
	return found ? found.label : timezone;
};

export function estimateBatteryLife(
	batteryVoltage: number,
	refreshPerDay: number,
	batteryCapacity = 1800, // use 2500mAh if you have battery upgrade
): { batteryPercentage: number; remainingDays: number; isCharging: boolean } {
	// Battery voltage range (adjust based on real battery discharge curve if needed)
	const V_CHARGING = 4.6; // Charging voltage
	const V_MAX = 4.2; // Fully charged
	const V_MIN = 3.6; // Cutoff voltage

	// Estimate battery percentage (linear approximation)
	const batteryPercentage = Math.max(
		0,
		Math.min(100, ((batteryVoltage - V_MIN) / (V_MAX - V_MIN)) * 100),
	);

	// Power consumption rates
	const SLEEP_POWER = 0.1 * 24; // 0.1mA * 24h = 2.4mAh per day in sleep mode
	const REFRESH_POWER = 32.8 * (24 / 3600); // 32.8mA for 24s per refresh (converted to mAh)

	// Total daily power consumption
	const dailyConsumption = refreshPerDay * REFRESH_POWER + SLEEP_POWER;

	// Remaining days calculation
	const remainingDays =
		((batteryCapacity || 1000) * (batteryPercentage / 100)) / dailyConsumption;

	return {
		batteryPercentage: Number.parseFloat(batteryPercentage.toFixed(2)),
		remainingDays: Number.parseFloat(remainingDays.toFixed(2)),
		isCharging: batteryVoltage > V_CHARGING,
	};
}
