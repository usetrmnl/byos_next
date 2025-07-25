// Database initialization SQL statements
export const SQL_STATEMENTS = {
  enableUuidExtension: {
    title: "Enable UUID Extension",
    description:
      "Enables the UUID generation extension for creating unique identifiers",
    sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  },
  createDevicesTable: {
    title: "Create Devices Table",
    description:
      "Creates the main devices table with all required fields and indexes",
    sql: `CREATE TABLE public.devices (
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
  playlist_id UUID REFERENCES public.playlists(id),
  use_playlist BOOLEAN DEFAULT FALSE,
  current_playlist_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_refresh_schedule ON public.devices USING GIN (refresh_schedule);`,
  },
  createLogsTable: {
    title: "Create Logs Table",
    description:
      "Creates the logs table for device activity tracking with foreign key constraints",
    sql: `CREATE TABLE public.logs (
  id BIGSERIAL PRIMARY KEY,
  friendly_id TEXT NULL,
  log_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT logs_friendly_id_fkey FOREIGN KEY (friendly_id) REFERENCES public.devices (friendly_id)
);`,
  },
  createPlaylistsTable: {
    title: "Create Playlists Table",
    description:
      "Creates the playlists table for managing device content schedules",
    sql: `CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  createPlaylistItemsTable: {
    title: "Create Playlist Items Table",
    description:
      "Creates the playlist_items table for individual items within playlists",
    sql: `CREATE TABLE public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  start_time TIME,
  end_time TIME,
  days_of_week JSONB,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
  },
  createSystemLogsTable: {
    title: "Create System Logs Table",
    description:
      "Creates the system logs table with indexes for efficient querying",
    sql: `CREATE TABLE public.system_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  level VARCHAR NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR NULL,
  metadata TEXT NULL,
  trace TEXT NULL
);

CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);`,
  },
};
