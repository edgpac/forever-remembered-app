ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS memorial_mode TEXT NOT NULL DEFAULT 'memorial';
