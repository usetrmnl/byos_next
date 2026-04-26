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
