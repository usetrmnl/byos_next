-- Title: Add Mixups and Display Mode
-- Description: Creates mixups tables and replaces use_playlist with display_mode enum

-- Create enum for layout IDs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mixup_layout_id') THEN
        CREATE TYPE mixup_layout_id AS ENUM (
            'quarters',
            'top-banner',
            'left-rail',
            'vertical-halves',
            'horizontal-halves'
        );
    END IF;
END
$$;

-- Create enum for device display mode
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_display_mode') THEN
        CREATE TYPE device_display_mode AS ENUM (
            'screen',
            'playlist',
            'mixup'
        );
    END IF;
END
$$;

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
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'devices'
            AND column_name = 'use_playlist'
    ) THEN
        UPDATE devices SET display_mode = 'playlist' WHERE use_playlist = TRUE;
        UPDATE devices SET display_mode = 'screen' WHERE use_playlist = FALSE OR use_playlist IS NULL;
        ALTER TABLE devices DROP COLUMN use_playlist;
    END IF;
END
$$;

