-- Title: Add metadata column to recipes
-- Description: Stores rendering config (params, renderSettings, hasDataFetch, props, published, tags) as JSONB

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
