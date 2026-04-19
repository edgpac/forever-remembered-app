
-- Memorials table
CREATE TABLE public.memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','active','archived')),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('person','pet')),
  full_name TEXT NOT NULL,
  nickname TEXT,
  birth_date TEXT,
  passing_date TEXT,
  hometown TEXT,
  location TEXT,
  occupation TEXT,
  personality_words TEXT,
  loves TEXT,
  strongest_memory TEXT,
  insider_detail TEXT,
  catchphrase TEXT,
  named_people TEXT,
  creator_relationship TEXT,
  miss_most TEXT,
  want_people_to_know TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'classic',
  portrait_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  narrative_en TEXT,
  narrative_es TEXT,
  creator_email TEXT NOT NULL,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  qr_png_url TEXT,
  qr_card_url TEXT,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memorials_memorial_id ON public.memorials(memorial_id);
CREATE INDEX idx_memorials_status ON public.memorials(status);
CREATE INDEX idx_memorials_creator_user_id ON public.memorials(creator_user_id);

ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;

-- Anyone can view active memorials
CREATE POLICY "Active memorials are publicly viewable"
ON public.memorials FOR SELECT
USING (status = 'active' OR status = 'generating');

-- Anyone can create a memorial (creator_email captured at submit)
CREATE POLICY "Anyone can create a memorial"
ON public.memorials FOR INSERT
WITH CHECK (true);

-- Only the creator can update their own memorial (once authed)
CREATE POLICY "Creator can update own memorial"
ON public.memorials FOR UPDATE
USING (creator_user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER memorials_set_updated_at
BEFORE UPDATE ON public.memorials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('portraits', 'portraits', true),
  ('gallery', 'gallery', true),
  ('qr-codes', 'qr-codes', true),
  ('qr-cards', 'qr-cards', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — public read, anyone can upload to portraits/gallery
CREATE POLICY "Public read portraits"
ON storage.objects FOR SELECT USING (bucket_id = 'portraits');

CREATE POLICY "Public read gallery"
ON storage.objects FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Public read qr-codes"
ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "Public read qr-cards"
ON storage.objects FOR SELECT USING (bucket_id = 'qr-cards');

CREATE POLICY "Anyone can upload portraits"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portraits');

CREATE POLICY "Anyone can upload gallery"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery');
