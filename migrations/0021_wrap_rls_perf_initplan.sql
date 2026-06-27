-- Title: Wrap RLS session lookups in (select ...) for per-statement evaluation
-- Description: Recreates tenant RLS policies with current_setting() calls wrapped in scalar subqueries so Postgres evaluates them once per statement (InitPlan) instead of once per row. Idempotent (DROP POLICY IF EXISTS + CREATE). Predicate-equivalent; row visibility unchanged. Refs #81.

-- A bare current_setting() in a policy predicate is re-evaluated once per row.
-- Wrapping it as (select current_setting(...)) lets the planner cache it as an
-- InitPlan for the whole statement -- the Supabase-documented RLS perf pattern.
-- (select f()) returns the same scalar, so every predicate below is unchanged.
--
-- Policies are dropped and recreated (rather than ALTER POLICY) so the migration
-- is idempotent and self-contained, matching the project's other RLS migrations.
-- Wrapping covers USING and WITH CHECK on every tenant-scoped policy, including
-- INSERT policies. recipes_update_policy stays USING-only (no WITH CHECK upstream).
--
-- Child-table policies (recipe_files, playlist_items, mixup_slots) gate access
-- through a correlated EXISTS on the parent row, where the InitPlan rewrite does
-- not apply, so they are intentionally left unchanged.

-- devices ---------------------------------------------------------------------
DROP POLICY IF EXISTS devices_select_policy ON devices;
CREATE POLICY devices_select_policy ON devices
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)) OR user_id IS NULL);

DROP POLICY IF EXISTS devices_insert_policy ON devices;
CREATE POLICY devices_insert_policy ON devices
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS devices_update_policy ON devices;
CREATE POLICY devices_update_policy ON devices
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)))
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS devices_delete_policy ON devices;
CREATE POLICY devices_delete_policy ON devices
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS devices_api_key_select_policy ON devices;
CREATE POLICY devices_api_key_select_policy ON devices
    FOR SELECT
    USING (
        (select current_setting('app.device_api_key', true)) <> ''
        AND api_key = (select current_setting('app.device_api_key', true))
    );

-- playlists -------------------------------------------------------------------
DROP POLICY IF EXISTS playlists_select_policy ON playlists;
CREATE POLICY playlists_select_policy ON playlists
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)) OR user_id IS NULL);

DROP POLICY IF EXISTS playlists_insert_policy ON playlists;
CREATE POLICY playlists_insert_policy ON playlists
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS playlists_update_policy ON playlists;
CREATE POLICY playlists_update_policy ON playlists
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)))
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS playlists_delete_policy ON playlists;
CREATE POLICY playlists_delete_policy ON playlists
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

-- mixups ----------------------------------------------------------------------
DROP POLICY IF EXISTS mixups_select_policy ON mixups;
CREATE POLICY mixups_select_policy ON mixups
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)) OR user_id IS NULL);

DROP POLICY IF EXISTS mixups_insert_policy ON mixups;
CREATE POLICY mixups_insert_policy ON mixups
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS mixups_update_policy ON mixups;
CREATE POLICY mixups_update_policy ON mixups
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)))
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS mixups_delete_policy ON mixups;
CREATE POLICY mixups_delete_policy ON mixups
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

-- screen_configs --------------------------------------------------------------
DROP POLICY IF EXISTS screen_configs_select_policy ON screen_configs;
CREATE POLICY screen_configs_select_policy ON screen_configs
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)) OR user_id IS NULL);

DROP POLICY IF EXISTS screen_configs_insert_policy ON screen_configs;
CREATE POLICY screen_configs_insert_policy ON screen_configs
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS screen_configs_update_policy ON screen_configs;
CREATE POLICY screen_configs_update_policy ON screen_configs
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)))
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS screen_configs_delete_policy ON screen_configs;
CREATE POLICY screen_configs_delete_policy ON screen_configs
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

-- recipes ---------------------------------------------------------------------
DROP POLICY IF EXISTS recipes_select_policy ON recipes;
CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)) OR user_id IS NULL);

DROP POLICY IF EXISTS recipes_insert_policy ON recipes;
CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

-- NB: recipes_update_policy has no WITH CHECK clause upstream (see 0010); USING only.
DROP POLICY IF EXISTS recipes_update_policy ON recipes;
CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS recipes_delete_policy ON recipes;
CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS recipes_shared_seed_insert_policy ON recipes;
CREATE POLICY recipes_shared_seed_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (
        user_id IS NULL
        AND (select current_setting('app.shared_recipe_seed', true)) = 'on'
    );

DROP POLICY IF EXISTS recipes_shared_seed_update_policy ON recipes;
CREATE POLICY recipes_shared_seed_update_policy ON recipes
    FOR UPDATE
    USING (
        user_id IS NULL
        AND (select current_setting('app.shared_recipe_seed', true)) = 'on'
    )
    WITH CHECK (
        user_id IS NULL
        AND (select current_setting('app.shared_recipe_seed', true)) = 'on'
    );

-- plugin_settings -------------------------------------------------------------
DROP POLICY IF EXISTS plugin_settings_select_policy ON plugin_settings;
CREATE POLICY plugin_settings_select_policy ON plugin_settings
    FOR SELECT
    USING (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS plugin_settings_insert_policy ON plugin_settings;
CREATE POLICY plugin_settings_insert_policy ON plugin_settings
    FOR INSERT
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS plugin_settings_update_policy ON plugin_settings;
CREATE POLICY plugin_settings_update_policy ON plugin_settings
    FOR UPDATE
    USING (user_id = (select current_setting('app.current_user_id', true)))
    WITH CHECK (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS plugin_settings_delete_policy ON plugin_settings;
CREATE POLICY plugin_settings_delete_policy ON plugin_settings
    FOR DELETE
    USING (user_id = (select current_setting('app.current_user_id', true)));

DROP POLICY IF EXISTS plugin_settings_capability_select_policy ON plugin_settings;
CREATE POLICY plugin_settings_capability_select_policy ON plugin_settings
    FOR SELECT
    USING (
        (select current_setting('app.capability_lookup_uuid', true)) <> ''
        AND uuid = (select current_setting('app.capability_lookup_uuid', true))
    );
