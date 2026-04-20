ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS legacy_links JSONB DEFAULT '[]'::jsonb;
