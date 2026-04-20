-- Memorial notes table — "Leave a Memory" feature
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS public.memorial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id TEXT NOT NULL REFERENCES public.memorials(memorial_id) ON DELETE CASCADE,
  author_name TEXT NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 100),
  note_text TEXT NOT NULL CHECK (length(trim(note_text)) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memorial_notes_memorial_id ON public.memorial_notes(memorial_id);

ALTER TABLE public.memorial_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read memorial notes"
  ON public.memorial_notes FOR SELECT USING (true);

CREATE POLICY "Anyone can add a memorial note"
  ON public.memorial_notes FOR INSERT
  WITH CHECK (
    length(trim(author_name)) BETWEEN 1 AND 100
    AND length(trim(note_text)) BETWEEN 1 AND 500
  );
