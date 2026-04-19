ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS music_links JSONB DEFAULT '[]'::jsonb;
