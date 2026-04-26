-- Title: Add Recipes and Recipe Files
-- Description: Creates recipes table (react + liquid types), recipe_files table, RLS policies, and adds recipe_id FK to mixup_slots

-- =============================================================================
-- Part 1: Create recipe_type enum
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_type') THEN
        CREATE TYPE recipe_type AS ENUM ('react', 'liquid');
    END IF;
END
$$;

-- =============================================================================
-- Part 2: Create recipes table
-- =============================================================================

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
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
    metadata JSONB DEFAULT '{}',
    user_id TEXT REFERENCES "user"("id") ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uniqueness: each user owns their own namespace of slugs, and there is one
-- global namespace for shared (system-seeded) recipes.
-- Named so ON CONFLICT can target them explicitly.
CREATE UNIQUE INDEX IF NOT EXISTS recipes_slug_user_key
    ON recipes (slug, user_id)
    WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS recipes_slug_shared_key
    ON recipes (slug)
    WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON recipes (user_id);
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
-- Part 4: RLS on recipes and recipe_files
-- =============================================================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes FORCE ROW LEVEL SECURITY;

-- SELECT: user sees own + shared (user_id IS NULL)
DROP POLICY IF EXISTS recipes_select_policy ON recipes;
DROP POLICY IF EXISTS recipes_insert_policy ON recipes;
DROP POLICY IF EXISTS recipes_update_policy ON recipes;
DROP POLICY IF EXISTS recipes_delete_policy ON recipes;

CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true) OR user_id IS NULL);

-- INSERT: user can only insert rows they own (shared recipes are seeded by admin role)
CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- UPDATE: user can only mutate their own rows (shared recipes are protected)
CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

-- DELETE: user can only delete their own rows (shared recipes are protected)
CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

-- recipe_files: RLS cascades through parent recipe's policy
ALTER TABLE recipe_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_files FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_files_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_select_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_insert_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_update_policy ON recipe_files;
DROP POLICY IF EXISTS recipe_files_delete_policy ON recipe_files;

CREATE POLICY recipe_files_select_policy ON recipe_files
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_files.recipe_id));

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

-- Grant permissions on new tables to byos_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes TO byos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_files TO byos_app;

-- =============================================================================
-- Part 5: Add recipe_id FK to mixup_slots
-- =============================================================================

ALTER TABLE mixup_slots ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mixup_slots_recipe_id ON mixup_slots (recipe_id);
