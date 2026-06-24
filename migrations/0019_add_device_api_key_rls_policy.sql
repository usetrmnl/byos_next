-- Title: Add device access-token RLS lookup
-- Description: Allows TRMNL device callbacks to resolve their owning user from the Access-Token header before switching to normal user-scoped RLS.

DROP POLICY IF EXISTS devices_api_key_select_policy ON devices;

CREATE POLICY devices_api_key_select_policy ON devices
    FOR SELECT
    USING (
        current_setting('app.device_api_key', true) <> ''
        AND api_key = current_setting('app.device_api_key', true)
    );
