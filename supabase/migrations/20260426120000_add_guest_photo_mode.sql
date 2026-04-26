ALTER TABLE memorials
  ADD COLUMN IF NOT EXISTS guest_photo_mode TEXT DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS pending_photo_urls JSONB DEFAULT '[]'::jsonb;
