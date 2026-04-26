-- Title: Create Schema Migrations Ledger
-- Description: Tracks applied migration files so setup runs only pending migrations.

CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
