-- playlists table
CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- playlist_items table
CREATE TABLE playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
    screen_id TEXT NOT NULL,
    duration INT NOT NULL DEFAULT 30,
    start_time TIME,
    end_time TIME,
    days_of_week JSONB,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Update devices table
ALTER TABLE devices
ADD COLUMN playlist_id UUID REFERENCES playlists(id),
    ADD COLUMN use_playlist BOOLEAN DEFAULT FALSE;