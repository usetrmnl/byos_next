-- Title: Add Screen Size Settings
-- Description: Adds screen width, height, orientation, and grayscale level to devices table

-- Add screen dimensions and settings columns
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS screen_width INTEGER DEFAULT 800,
ADD COLUMN IF NOT EXISTS screen_height INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS screen_orientation VARCHAR(20) DEFAULT 'landscape',
ADD COLUMN IF NOT EXISTS grayscale INTEGER DEFAULT 0;

-- Add comments to the new columns
COMMENT ON COLUMN devices.screen_width IS 'Screen width in pixels';
COMMENT ON COLUMN devices.screen_height IS 'Screen height in pixels';
COMMENT ON COLUMN devices.screen_orientation IS 'Screen orientation: portrait or landscape';
COMMENT ON COLUMN devices.grayscale IS 'Grayscale level (0-255, where 0 is full color and 255 is full grayscale)';

