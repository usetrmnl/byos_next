-- Title: Add Playlist Index to Devices
-- Description: Adds current_playlist_index column to devices table for tracking playlist position
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS current_playlist_index INT DEFAULT 0;