-- Title: Add Device Model
-- Description: Persist the TRMNL panel model reported by the device firmware
-- in the `Model` request header, plus an optional palette override when a
-- model declares multiple supported palettes (e.g. seeed_e1002 → bw|color-6a).
--
-- Everything else (width, height, bit_depth, mime_type, scale_factor,
-- rotation, css, image_size_limit, palette colors) is derived at render time
-- from the local TRMNL registry (lib/trmnl/registry.ts) keyed by `model`.
-- Storing those would create drift between cached upstream data and DB
-- snapshots.

ALTER TABLE devices
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS palette_id TEXT;

COMMENT ON COLUMN devices.model IS 'TRMNL model name reported via the Model request header (e.g. og_plus, seeed_e1002, v2). Used to resolve render parameters from the local TRMNL models registry.';
COMMENT ON COLUMN devices.palette_id IS 'Optional palette override when the device model supports multiple palettes. NULL means use the model''s first declared palette as default.';
