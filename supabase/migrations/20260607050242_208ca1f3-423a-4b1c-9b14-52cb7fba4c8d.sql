
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

DROP POLICY IF EXISTS "sender can update own" ON public.messages;
CREATE POLICY "sender can update own"
ON public.messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "pair member can react or mark read" ON public.messages;
CREATE POLICY "pair member can react or mark read"
ON public.messages FOR UPDATE
TO authenticated
USING (public.is_pair_member(pair_id, auth.uid()))
WITH CHECK (public.is_pair_member(pair_id, auth.uid()));
