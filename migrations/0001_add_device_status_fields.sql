-- Title: Add Device Status Fields
-- Description: Add battery_voltage, firmware_version, and rssi columns to the devices table
-- Add battery_voltage, firmware_version, and rssi columns to the devices table
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS battery_voltage NUMERIC,
ADD COLUMN IF NOT EXISTS firmware_version TEXT,
ADD COLUMN IF NOT EXISTS rssi INTEGER;

-- Add comment to the new columns
COMMENT ON COLUMN devices.battery_voltage IS 'Battery voltage in volts';
COMMENT ON COLUMN devices.firmware_version IS 'Device firmware version';
COMMENT ON COLUMN devices.rssi IS 'WiFi signal strength in dBm'; 