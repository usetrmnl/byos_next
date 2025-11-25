// This file is auto-generated from migration files.
// Do not edit manually. Run 'pnpm generate:sql' to regenerate.
// Generated at: 2025-11-25T23:11:53.837Z

export const SQL_STATEMENTS = {
	"0000_initial_schema": {
		title: "Initial Database Schema",
		description: "Creates the complete initial database schema including UUID extension, devices, playlists, playlist_items, logs, and system_logs tables",
		sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.devices (
  id BIGSERIAL PRIMARY KEY,
  friendly_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  mac_address VARCHAR NOT NULL UNIQUE,
  api_key VARCHAR NOT NULL UNIQUE,
  screen VARCHAR NULL DEFAULT NULL,
  refresh_schedule JSONB NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_update_time TIMESTAMPTZ NULL,
  next_expected_update TIMESTAMPTZ NULL,
  last_refresh_duration INTEGER NULL,
  battery_voltage NUMERIC NULL,
  firmware_version TEXT NULL,
  rssi INTEGER NULL,
  playlist_id UUID,
  use_playlist BOOLEAN DEFAULT FALSE,
  current_playlist_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);

CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  start_time TIME,
  end_time TIME,
  days_of_week JSONB,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for devices.playlist_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'devices_playlist_id_fkey'
  ) THEN
    ALTER TABLE public.devices
    ADD CONSTRAINT devices_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.logs (
  id BIGSERIAL PRIMARY KEY,
  friendly_id TEXT NULL,
  log_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  level VARCHAR NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR NULL,
  metadata TEXT NULL,
  trace TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);`,
	},
	"0001_add_device_status_fields": {
		title: "Add Device Status Fields",
		description: "Add battery_voltage, firmware_version, and rssi columns to the devices table",
		sql: `-- Add battery_voltage, firmware_version, and rssi columns to the devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS battery_voltage NUMERIC,
ADD COLUMN IF NOT EXISTS firmware_version TEXT,
ADD COLUMN IF NOT EXISTS rssi INTEGER;

-- Add comment to the new columns
COMMENT ON COLUMN devices.battery_voltage IS 'Battery voltage in volts';
COMMENT ON COLUMN devices.firmware_version IS 'Device firmware version';
COMMENT ON COLUMN devices.rssi IS 'WiFi signal strength in dBm';`,
	},
	"0002_add_playlist_index_to_devices": {
		title: "Add Playlist Index to Devices",
		description: "Adds current_playlist_index column to devices table for tracking playlist position",
		sql: `ALTER TABLE devices
ADD COLUMN IF NOT EXISTS current_playlist_index INT DEFAULT 0;`,
	},
	"0003_add_playlists": {
		title: "Add Playlists and Playlist Items",
		description: "Creates the playlists and playlist_items tables and adds playlist support to devices table",
		sql: `-- playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- playlist_items table
CREATE TABLE IF NOT EXISTS playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    screen_id TEXT NOT NULL,
    duration INT NOT NULL DEFAULT 30,
    start_time TIME,
    end_time TIME,
    days_of_week JSONB,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Update devices table
ALTER TABLE devices
ADD COLUMN playlist_id UUID REFERENCES playlists(id),
    ADD COLUMN use_playlist BOOLEAN DEFAULT FALSE;`,
	}
};
