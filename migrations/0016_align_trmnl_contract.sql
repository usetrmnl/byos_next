-- Title: Align TRMNL contract — capability URLs, shared recipe seeding, device sleep
-- Description: Adds plugin_settings UUID capability policy (no-auth webhooks), shared-recipe seed policy under RLS, and device sleep columns to match TRMNL PATCH /devices/{id}.

-- =============================================================================
-- Part 1: Plugin settings — UUID acts as a capability URL (no session required)
--
-- TRMNL contract: knowing the UUID of a plugin setting is sufficient to read
-- and update it. Numeric IDs still require session auth. The application
-- resolves the row owner by setting `app.capability_lookup_uuid`, then
-- re-scopes to that owner via `app.current_user_id` for the actual mutation.
-- =============================================================================

DROP POLICY IF EXISTS plugin_settings_capability_select_policy ON plugin_settings;

CREATE POLICY plugin_settings_capability_select_policy ON plugin_settings
    FOR SELECT
    USING (
        current_setting('app.capability_lookup_uuid', true) <> ''
        AND uuid = current_setting('app.capability_lookup_uuid', true)
    );

-- =============================================================================
-- Part 2: Shared recipe seeding — boot-time sync inserts/updates rows with
-- user_id = NULL. Existing INSERT/UPDATE policies require user ownership, so
-- under FORCE RLS the seed bombs out. A scoped seed flag opens just enough
-- of a hole to write shared rows from a privileged code path.
-- =============================================================================

DROP POLICY IF EXISTS recipes_shared_seed_insert_policy ON recipes;
DROP POLICY IF EXISTS recipes_shared_seed_update_policy ON recipes;

CREATE POLICY recipes_shared_seed_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (
        user_id IS NULL
        AND current_setting('app.shared_recipe_seed', true) = 'on'
    );

CREATE POLICY recipes_shared_seed_update_policy ON recipes
    FOR UPDATE
    USING (
        user_id IS NULL
        AND current_setting('app.shared_recipe_seed', true) = 'on'
    )
    WITH CHECK (
        user_id IS NULL
        AND current_setting('app.shared_recipe_seed', true) = 'on'
    );

-- =============================================================================
-- Part 3: Device sleep mode — restore TRMNL PATCH /api/devices/{id} support
-- =============================================================================

ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS sleep_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sleep_start_time INTEGER,
    ADD COLUMN IF NOT EXISTS sleep_end_time INTEGER;

COMMENT ON COLUMN devices.sleep_mode_enabled IS 'Whether the device honors the configured quiet-hours window.';
COMMENT ON COLUMN devices.sleep_start_time IS 'Quiet-hours start as minutes since midnight (TRMNL convention).';
COMMENT ON COLUMN devices.sleep_end_time IS 'Quiet-hours end as minutes since midnight (TRMNL convention).';
