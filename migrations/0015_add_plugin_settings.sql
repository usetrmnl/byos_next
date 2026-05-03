-- Title: Add Plugin Settings
-- Description: Stores local TRMNL-compatible plugin settings, data, markup, and archives.

CREATE TABLE IF NOT EXISTS plugin_settings (
  id BIGSERIAL PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plugin_id INTEGER NOT NULL,
  icon_url TEXT,
  icon_content_type TEXT,
  read_only BOOLEAN NOT NULL DEFAULT FALSE,
  strategy TEXT DEFAULT 'webhook',
  merge_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  markup JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings_yaml TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plugin_settings_user_id ON plugin_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_settings_plugin_id ON plugin_settings(plugin_id);

-- =============================================================================
-- RLS: tenant ownership enforced at the DB layer (matches 0014_harden_rls.sql)
-- =============================================================================

ALTER TABLE plugin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plugin_settings_select_policy ON plugin_settings;
DROP POLICY IF EXISTS plugin_settings_insert_policy ON plugin_settings;
DROP POLICY IF EXISTS plugin_settings_update_policy ON plugin_settings;
DROP POLICY IF EXISTS plugin_settings_delete_policy ON plugin_settings;

CREATE POLICY plugin_settings_select_policy ON plugin_settings
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY plugin_settings_insert_policy ON plugin_settings
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY plugin_settings_update_policy ON plugin_settings
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY plugin_settings_delete_policy ON plugin_settings
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

GRANT SELECT, INSERT, UPDATE, DELETE ON plugin_settings TO byos_app;
GRANT USAGE, SELECT ON SEQUENCE plugin_settings_id_seq TO byos_app;
