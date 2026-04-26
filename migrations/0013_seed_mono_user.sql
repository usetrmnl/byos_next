-- Title: Seed mono user for auth-disabled deployments
-- Description: When AUTH_ENABLED=false, the app scopes RLS with a stable user id; this row satisfies FKs on user_id columns.

INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt", "role")
VALUES (
    'byos_mono_user',
    'Local user',
    'mono@byos.local',
    true,
    NOW(),
    NOW(),
    'user'
)
ON CONFLICT ("id") DO NOTHING;

-- Existing single-user installs predate user ownership. Claim those rows for
-- the mono user so stricter RLS write policies can still update them.
UPDATE devices
SET user_id = 'byos_mono_user'
WHERE user_id IS NULL;

UPDATE playlists
SET user_id = 'byos_mono_user'
WHERE user_id IS NULL;

UPDATE mixups
SET user_id = 'byos_mono_user'
WHERE user_id IS NULL;

UPDATE screen_configs
SET user_id = 'byos_mono_user'
WHERE user_id IS NULL;
