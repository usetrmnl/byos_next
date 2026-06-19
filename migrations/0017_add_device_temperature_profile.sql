-- Title: Add Device Temperature Profile
-- Description: Per-device color/shadow tuning profile sent back to the firmware
-- on /api/display as `temperature_profile`. Firmware advertises support via the
-- `temperature-profile: true` request header; we cache that capability flag so
-- the UI can decide whether to expose the setting.

ALTER TABLE devices
ADD COLUMN IF NOT EXISTS temperature_profile TEXT NOT NULL DEFAULT 'default';

ALTER TABLE devices
DROP CONSTRAINT IF EXISTS devices_temperature_profile_check;

ALTER TABLE devices
ADD CONSTRAINT devices_temperature_profile_check
CHECK (temperature_profile IN ('default', 'a', 'b', 'c'));

ALTER TABLE devices
ADD COLUMN IF NOT EXISTS supports_temperature_profile BOOLEAN;

COMMENT ON COLUMN devices.temperature_profile IS 'Display tuning profile sent to the firmware in the /api/display response (default|a|b|c).';
COMMENT ON COLUMN devices.supports_temperature_profile IS 'TRUE when the device sent the `temperature-profile: true` request header on its last /api/display call. NULL until the device has been seen.';
