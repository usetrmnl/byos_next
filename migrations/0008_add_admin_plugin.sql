-- Title: Add Admin Plugin Fields
-- Description: Adds role, banned, banReason, banExpires to user table and impersonatedBy to session table for better-auth admin plugin

-- Add admin fields to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" timestamptz;

-- Add impersonation field to session table
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" text;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");
