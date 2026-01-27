-- Title: Add User Tenancy with Row Level Security
-- Description: Adds user_id to tables, implements PostgreSQL RLS, and creates app role for RLS enforcement

-- =============================================================================
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
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO byos_app;
