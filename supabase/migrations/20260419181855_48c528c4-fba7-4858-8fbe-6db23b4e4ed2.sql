-- Allow a signed-in user to claim ownership of memorials created with their email
CREATE POLICY "Signed-in user can claim memorial by email"
ON public.memorials
FOR UPDATE
TO authenticated
USING (
  creator_user_id IS NULL
  AND creator_email = (auth.jwt() ->> 'email')
)
WITH CHECK (
  creator_user_id = auth.uid()
  AND creator_email = (auth.jwt() ->> 'email')
);