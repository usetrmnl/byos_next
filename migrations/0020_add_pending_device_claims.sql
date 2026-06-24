-- Title: Add Pending Device Claims
-- Description: Stores server-side claim mappings for unowned devices that show claim codes on /api/display.

CREATE TABLE IF NOT EXISTS pending_device_claims (
    claim_hash TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    api_key_suffix TEXT NOT NULL,
    mac_address TEXT,
    model TEXT,
    width INTEGER,
    height INTEGER,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_device_claims_last_seen_idx
    ON pending_device_claims (last_seen_at DESC);
