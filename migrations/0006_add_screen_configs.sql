-- Title: Add Screen Configs
-- Description: Stores per-screen parameter configurations

CREATE TABLE IF NOT EXISTS public.screen_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id TEXT NOT NULL UNIQUE,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to speed up lookups by screen_id
CREATE INDEX IF NOT EXISTS idx_screen_configs_screen_id ON public.screen_configs (screen_id);

-- Comment for clarity
COMMENT ON TABLE public.screen_configs IS 'Per-screen configuration parameters stored as JSONB';
COMMENT ON COLUMN public.screen_configs.params IS 'JSON blob of screen parameters';

