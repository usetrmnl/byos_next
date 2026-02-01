-- Title: Add Recipes and Recipe Files
-- Description: Creates recipes table (react + liquid types), recipe_files table, RLS policies, and adds recipe_id FK to mixup_slots

-- =============================================================================
-- Part 1: Create recipe_type enum
-- =============================================================================

CREATE TYPE recipe_type AS ENUM ('react', 'liquid');

-- =============================================================================
-- Part 2: Create recipes table
-- =============================================================================

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    type recipe_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    repo TEXT,
    screenshot_url TEXT,
    logo_url TEXT,
    author TEXT,
    author_github TEXT,
    author_email TEXT,
    zip_url TEXT,
    zip_entry_path TEXT,
    category TEXT,
    version TEXT,
    user_id TEXT REFERENCES "user"("id") ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON recipes (user_id);
CREATE INDEX IF NOT EXISTS recipes_slug_idx ON recipes (slug);
CREATE INDEX IF NOT EXISTS recipes_type_idx ON recipes (type);

-- =============================================================================
-- Part 3: Create recipe_files table
-- =============================================================================

CREATE TABLE IF NOT EXISTS recipe_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (recipe_id, filename)
);

CREATE INDEX IF NOT EXISTS recipe_files_recipe_id_idx ON recipe_files (recipe_id);

-- =============================================================================
-- Part 4: RLS on recipes (recipe_files skipped — access controlled via parent)
-- =============================================================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes FORCE ROW LEVEL SECURITY;

-- Policies for recipes
CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- Grant permissions on new tables to byos_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO byos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_files TO byos_app;

-- =============================================================================
-- Part 5: Add recipe_id FK to mixup_slots
-- =============================================================================

ALTER TABLE mixup_slots ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mixup_slots_recipe_id ON mixup_slots (recipe_id);
