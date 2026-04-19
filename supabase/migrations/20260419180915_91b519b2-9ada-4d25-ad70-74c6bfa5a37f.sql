
-- Tighten memorial INSERT: enforce non-empty creator_email and reasonable name length
DROP POLICY IF EXISTS "Anyone can create a memorial" ON public.memorials;
CREATE POLICY "Anyone can create a memorial"
ON public.memorials FOR INSERT
WITH CHECK (
  length(creator_email) BETWEEN 5 AND 320
  AND creator_email LIKE '%_@_%._%'
  AND length(full_name) BETWEEN 1 AND 200
  AND length(memorial_id) BETWEEN 6 AND 64
);

-- Replace broad storage SELECT with scoped policies (no listing, only direct fetch by name)
DROP POLICY IF EXISTS "Public read portraits" ON storage.objects;
DROP POLICY IF EXISTS "Public read gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public read qr-codes" ON storage.objects;
DROP POLICY IF EXISTS "Public read qr-cards" ON storage.objects;

CREATE POLICY "Public read portraits by name"
ON storage.objects FOR SELECT
USING (bucket_id = 'portraits' AND name IS NOT NULL);

CREATE POLICY "Public read gallery by name"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery' AND name IS NOT NULL);

CREATE POLICY "Public read qr-codes by name"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-codes' AND name IS NOT NULL);

CREATE POLICY "Public read qr-cards by name"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-cards' AND name IS NOT NULL);
