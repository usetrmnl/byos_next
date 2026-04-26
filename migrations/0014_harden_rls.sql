-- Title: Harden RLS policies
-- Description: Tightens tenant writes, scopes child tables through their parent rows, and fixes screen config uniqueness for per-user settings.

-- =============================================================================
-- Part 1: Screen configs should be unique per user, not globally per screen
-- =============================================================================

ALTER TABLE screen_configs DROP CONSTRAINT IF EXISTS screen_configs_screen_id_key;
DROP INDEX IF EXISTS screen_configs_screen_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS screen_configs_screen_id_user_key
    ON screen_configs (screen_id, user_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS screen_configs_screen_id_shared_key
    ON screen_configs (screen_id)
    WHERE user_id IS NULL;

-- =============================================================================
-- Part 2: Shared/unclaimed rows are readable, but user-scoped writes must own rows
-- =============================================================================

DROP POLICY IF EXISTS devices_insert_policy ON devices;
DROP POLICY IF EXISTS devices_update_policy ON devices;
DROP POLICY IF EXISTS devices_delete_policy ON devices;

CREATE POLICY devices_insert_policy ON devices
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY devices_update_policy ON devices
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY devices_delete_policy ON devices
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS playlists_insert_policy ON playlists;
DROP POLICY IF EXISTS playlists_update_policy ON playlists;
DROP POLICY IF EXISTS playlists_delete_policy ON playlists;

CREATE POLICY playlists_insert_policy ON playlists
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY playlists_update_policy ON playlists
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY playlists_delete_policy ON playlists
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS mixups_insert_policy ON mixups;
DROP POLICY IF EXISTS mixups_update_policy ON mixups;
DROP POLICY IF EXISTS mixups_delete_policy ON mixups;

CREATE POLICY mixups_insert_policy ON mixups
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY mixups_update_policy ON mixups
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY mixups_delete_policy ON mixups
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS screen_configs_insert_policy ON screen_configs;
DROP POLICY IF EXISTS screen_configs_update_policy ON screen_configs;
DROP POLICY IF EXISTS screen_configs_delete_policy ON screen_configs;

CREATE POLICY screen_configs_insert_policy ON screen_configs
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY screen_configs_update_policy ON screen_configs
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY screen_configs_delete_policy ON screen_configs
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

-- =============================================================================
-- Part 3: Child tables inherit tenant scope from their parent rows
-- =============================================================================

DROP POLICY IF EXISTS recipe_files_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_select_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_insert_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_update_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_delete_policy ON recipe_files;

CREATE POLICY recipe_files_select_policy ON recipe_files
    FOR SELECT
    USING (EXISTS (
        SELECT 1
        FROM recipes r
        WHERE r.id = recipe_files.recipe_id
    ));

CREATE POLICY recipe_files_insert_policy ON recipe_files
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1
        FROM recipes r
        WHERE r.id = recipe_files.recipe_id
            AND r.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY recipe_files_update_policy ON recipe_files
    FOR UPDATE
    USING (EXISTS (
        SELECT 1
        FROM recipes r
        WHERE r.id = recipe_files.recipe_id
            AND r.user_id = current_setting('app.current_user_id', true)
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM recipes r
        WHERE r.id = recipe_files.recipe_id
            AND r.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY recipe_files_delete_policy ON recipe_files
    FOR DELETE
    USING (EXISTS (
        SELECT 1
        FROM recipes r
        WHERE r.id = recipe_files.recipe_id
            AND r.user_id = current_setting('app.current_user_id', true)
    ));

ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS playlist_items_select_policy ON playlist_items;
DROP POLICY IF EXISTS playlist_items_insert_policy ON playlist_items;
DROP POLICY IF EXISTS playlist_items_update_policy ON playlist_items;
DROP POLICY IF EXISTS playlist_items_delete_policy ON playlist_items;

CREATE POLICY playlist_items_select_policy ON playlist_items
    FOR SELECT
    USING (EXISTS (
        SELECT 1
        FROM playlists p
        WHERE p.id = playlist_items.playlist_id
    ));

CREATE POLICY playlist_items_insert_policy ON playlist_items
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1
        FROM playlists p
        WHERE p.id = playlist_items.playlist_id
            AND p.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY playlist_items_update_policy ON playlist_items
    FOR UPDATE
    USING (EXISTS (
        SELECT 1
        FROM playlists p
        WHERE p.id = playlist_items.playlist_id
            AND p.user_id = current_setting('app.current_user_id', true)
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM playlists p
        WHERE p.id = playlist_items.playlist_id
            AND p.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY playlist_items_delete_policy ON playlist_items
    FOR DELETE
    USING (EXISTS (
        SELECT 1
        FROM playlists p
        WHERE p.id = playlist_items.playlist_id
            AND p.user_id = current_setting('app.current_user_id', true)
    ));

ALTER TABLE mixup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixup_slots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mixup_slots_select_policy ON mixup_slots;
DROP POLICY IF EXISTS mixup_slots_insert_policy ON mixup_slots;
DROP POLICY IF EXISTS mixup_slots_update_policy ON mixup_slots;
DROP POLICY IF EXISTS mixup_slots_delete_policy ON mixup_slots;

CREATE POLICY mixup_slots_select_policy ON mixup_slots
    FOR SELECT
    USING (EXISTS (
        SELECT 1
        FROM mixups m
        WHERE m.id = mixup_slots.mixup_id
    ));

CREATE POLICY mixup_slots_insert_policy ON mixup_slots
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1
        FROM mixups m
        WHERE m.id = mixup_slots.mixup_id
            AND m.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY mixup_slots_update_policy ON mixup_slots
    FOR UPDATE
    USING (EXISTS (
        SELECT 1
        FROM mixups m
        WHERE m.id = mixup_slots.mixup_id
            AND m.user_id = current_setting('app.current_user_id', true)
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM mixups m
        WHERE m.id = mixup_slots.mixup_id
            AND m.user_id = current_setting('app.current_user_id', true)
    ));

CREATE POLICY mixup_slots_delete_policy ON mixup_slots
    FOR DELETE
    USING (EXISTS (
        SELECT 1
        FROM mixups m
        WHERE m.id = mixup_slots.mixup_id
            AND m.user_id = current_setting('app.current_user_id', true)
    ));

GRANT SELECT, INSERT, UPDATE, DELETE ON playlist_items TO byos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON mixup_slots TO byos_app;
