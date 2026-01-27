// This file is auto-generated from migration files.
// Do not edit manually. Run 'pnpm generate:sql' to regenerate.

export const SQL_STATEMENTS = {
	"0000_initial_schema": {
		title: "Initial Database Schema",
		description:
			"Creates the complete initial database schema including UUID extension, devices, playlists, playlist_items, logs, and system_logs tables",
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
		description:
			"Add battery_voltage, firmware_version, and rssi columns to the devices table",
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
		description:
			"Adds current_playlist_index column to devices table for tracking playlist position",
		sql: `ALTER TABLE devices
ADD COLUMN IF NOT EXISTS current_playlist_index INT DEFAULT 0;`,
	},
	"0003_add_playlists": {
		title: "Add Playlists and Playlist Items",
		description:
			"Creates the playlists and playlist_items tables and adds playlist support to devices table",
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
	},
	"0004_add_mixups": {
		title: "Add Mixups and Display Mode",
		description:
			"Creates mixups tables and replaces use_playlist with display_mode enum",
		sql: `-- Create enum for layout IDs
CREATE TYPE mixup_layout_id AS ENUM (
    'quarters',
    'top-banner',
    'left-rail',
    'vertical-halves',
    'horizontal-halves'
);

-- Create enum for device display mode
CREATE TYPE device_display_mode AS ENUM (
    'screen',
    'playlist',
    'mixup'
);

-- Create mixups table
CREATE TABLE IF NOT EXISTS mixups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    layout_id mixup_layout_id NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mixup_slots table
CREATE TABLE IF NOT EXISTS mixup_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mixup_id UUID REFERENCES mixups(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL,
    recipe_slug TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mixup_slots_mixup_id ON mixup_slots(mixup_id);
CREATE INDEX IF NOT EXISTS idx_mixup_slots_order ON mixup_slots(mixup_id, order_index);

-- Add mixup_id column to devices
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS mixup_id UUID REFERENCES mixups(id);

-- Add display_mode column with default based on existing use_playlist value
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS display_mode device_display_mode DEFAULT 'screen';

-- Migrate existing data: if use_playlist is true, set display_mode to 'playlist'
UPDATE devices SET display_mode = 'playlist' WHERE use_playlist = TRUE;
UPDATE devices SET display_mode = 'screen' WHERE use_playlist = FALSE OR use_playlist IS NULL;

-- Drop the old use_playlist column
ALTER TABLE devices DROP COLUMN IF EXISTS use_playlist;`,
	},
	"0005_add_screen_size_settings": {
		title: "Add Screen Size Settings",
		description:
			"Adds screen width, height, orientation, and grayscale level to devices table",
		sql: `-- Add screen dimensions and settings columns
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS screen_width INTEGER DEFAULT 800,
ADD COLUMN IF NOT EXISTS screen_height INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS screen_orientation VARCHAR(20) DEFAULT 'landscape',
ADD COLUMN IF NOT EXISTS grayscale INTEGER DEFAULT 0;

-- Add comments to the new columns
COMMENT ON COLUMN devices.screen_width IS 'Screen width in pixels';
COMMENT ON COLUMN devices.screen_height IS 'Screen height in pixels';
COMMENT ON COLUMN devices.screen_orientation IS 'Screen orientation: portrait or landscape';
COMMENT ON COLUMN devices.grayscale IS 'Grayscale level (0-255, where 0 is full color and 255 is full grayscale)';`,
	},
	"0006_add_screen_configs": {
		title: "Add Screen Configs",
		description: "Stores per-screen parameter configurations",
		sql: `CREATE TABLE IF NOT EXISTS public.screen_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id TEXT NOT NULL UNIQUE,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to speed up lookups by screen_id
CREATE INDEX IF NOT EXISTS idx_screen_configs_screen_id ON public.screen_configs (screen_id);

-- Comment for clarity
COMMENT ON TABLE public.screen_configs IS 'Per-screen configuration parameters stored as JSONB';
COMMENT ON COLUMN public.screen_configs.params IS 'JSON blob of screen parameters';`,
	},
	"0007_add_better_auth": {
		title: "0007_add_better_auth",
		description: "Migration: 0007_add_better_auth.sql",
		sql: `create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");`,
	},
	"0008_add_admin_plugin": {
		title: "Add Admin Plugin Fields",
		description:
			"Adds role, banned, banReason, banExpires to user table and impersonatedBy to session table for better-auth admin plugin",
		sql: `-- Add admin fields to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" timestamptz;

-- Add impersonation field to session table
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");`,
	},
	"0009_add_user_tenancy": {
		title: "Add User Tenancy with Row Level Security",
		description:
			"Adds user_id to tables, implements PostgreSQL RLS, and creates app role for RLS enforcement",
		sql: `-- =============================================================================
-- Part 1: Add user_id columns
-- =============================================================================

-- Add user_id to devices table
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "user"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "devices_user_id_idx" ON "devices" ("user_id");

-- Add user_id to playlists table
ALTER TABLE "playlists" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "user"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "playlists_user_id_idx" ON "playlists" ("user_id");

-- Add user_id to mixups table
ALTER TABLE "mixups" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "user"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "mixups_user_id_idx" ON "mixups" ("user_id");

-- Add user_id to screen_configs table
ALTER TABLE "screen_configs" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "user"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "screen_configs_user_id_idx" ON "screen_configs" ("user_id");

-- =============================================================================
-- Part 2: Enable Row Level Security
-- =============================================================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixups ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_configs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Part 3: Create RLS Policies
-- Users can access their own rows OR rows with NULL user_id (unclaimed/shared)
-- =============================================================================

-- Policies for devices
CREATE POLICY devices_select_policy ON devices
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY devices_insert_policy ON devices
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY devices_update_policy ON devices
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY devices_delete_policy ON devices
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- Policies for playlists
CREATE POLICY playlists_select_policy ON playlists
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY playlists_insert_policy ON playlists
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY playlists_update_policy ON playlists
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY playlists_delete_policy ON playlists
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- Policies for mixups
CREATE POLICY mixups_select_policy ON mixups
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY mixups_insert_policy ON mixups
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY mixups_update_policy ON mixups
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY mixups_delete_policy ON mixups
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- Policies for screen_configs
CREATE POLICY screen_configs_select_policy ON screen_configs
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY screen_configs_insert_policy ON screen_configs
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY screen_configs_update_policy ON screen_configs
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY screen_configs_delete_policy ON screen_configs
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- =============================================================================
-- Part 4: Force RLS for table owners (important for dev with postgres superuser)
-- =============================================================================

ALTER TABLE devices FORCE ROW LEVEL SECURITY;
ALTER TABLE playlists FORCE ROW LEVEL SECURITY;
ALTER TABLE mixups FORCE ROW LEVEL SECURITY;
ALTER TABLE screen_configs FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- Part 5: Create application role for RLS enforcement
-- The app connects as postgres but uses SET ROLE byos_app for queries
-- This ensures RLS is enforced (superusers bypass RLS even with FORCE)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'byos_app') THEN
        CREATE ROLE byos_app WITH LOGIN PASSWORD 'byos_app_password';
    END IF;
END
$$;

-- Ensure the role does NOT have BYPASSRLS (default, but explicit for clarity)
ALTER ROLE byos_app NOBYPASSRLS;

-- Allow postgres to switch to this role via SET ROLE
GRANT byos_app TO postgres;

-- Grant connect to database
GRANT CONNECT ON DATABASE byos_db TO byos_app;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO byos_app;

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO byos_app;

-- Grant permissions on all sequences (for serial/auto-increment columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO byos_app;

-- Ensure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO byos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO byos_app;`,
	},
	validate_schema: {
		title: "Validate Database Schema",
		description:
			"Validates that all required tables exist in the public schema. Returns list of tables with their status and identifies any missing tables.",
		sql: `-- Check for missing required tables
-- Returns empty result if all tables exist, or rows with missing table names if any are missing
SELECT 
  expected_table as missing_table
FROM unnest(ARRAY['devices', 'logs', 'mixup_slots', 'mixups', 'playlist_items', 'playlists', 'screen_configs', 'system_logs']::text[]) as expected_table
WHERE NOT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name = expected_table
);`,
	},
};
