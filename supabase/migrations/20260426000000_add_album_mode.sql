-- Allow 'album' as a value for memorial_mode (column is text, no constraint change needed).
-- This migration documents the new mode for reference.
-- Existing rows with NULL memorial_mode default to 'memorial' in application logic.
COMMENT ON COLUMN memorials.memorial_mode IS 'Values: memorial | story | album';
