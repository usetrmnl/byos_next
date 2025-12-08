import { DeviceDisplayMode } from "@/lib/mixup/constants";

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type TimeRange = {
	start_time: string; // Format: "HH:MM" in 24-hour format
	end_time: string; // Format: "HH:MM" in 24-hour format
	refresh_rate: number; // Refresh rate in seconds
};

export type RefreshSchedule = {
	default_refresh_rate: number; // Default refresh rate in seconds
	time_ranges: TimeRange[]; // Array of time ranges with specific refresh rates
};

export type Device = {
	id: number;
	name: string;
	mac_address: string;
	api_key: string;
	friendly_id: string;
	screen: string | null;
	refresh_schedule: RefreshSchedule | null;
	timezone: string;
	last_update_time: string | null;
	next_expected_update: string | null;
	last_refresh_duration: number | null;
	battery_voltage: number | null;
	firmware_version: string | null;
	rssi: number | null;
	created_at: string | null;
	updated_at: string | null;
	playlist_id: string | null;
	mixup_id: string | null;
	display_mode: DeviceDisplayMode;
	current_playlist_index: number | null;
	screen_width: number | null;
	screen_height: number | null;
	screen_orientation: string | null;
	grayscale: number | null;
};

export type Playlist = {
	id: string;
	name: string;
	created_at: string | null;
	updated_at: string | null;
};

export type PlaylistItem = {
	id: string;
	playlist_id: string | null;
	screen_id: string;
	duration: number;
	start_time: string | null;
	end_time: string | null;
	days_of_week: string[] | null;
	order_index: number;
	created_at: string | null;
};

export type Mixup = {
	id: string;
	name: string;
	layout_id: string;
	created_at: string | null;
	updated_at: string | null;
};

export type MixupSlot = {
	id: string;
	mixup_id: string | null;
	slot_id: string;
	recipe_slug: string | null;
	order_index: number;
	created_at: string | null;
};

export type Log = {
	id: number;
	friendly_id: string | null;
	log_data: string;
	created_at: string | null;
};

export type SystemLog = {
	id: string;
	created_at: string | null;
	level: string;
	message: string;
	source: string | null;
	metadata: string | null;
	trace: string | null;
};

// Re-export for convenience
export { DeviceDisplayMode } from "@/lib/mixup/constants";
