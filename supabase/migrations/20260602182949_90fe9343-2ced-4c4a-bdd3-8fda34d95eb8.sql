
-- COUPLE PAIRING + MESSAGING
CREATE TABLE public.couple_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT couple_pairs_distinct CHECK (user_a <> user_b),
  CONSTRAINT couple_pairs_user_a_unique UNIQUE (user_a),
  CONSTRAINT couple_pairs_user_b_unique UNIQUE (user_b)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_pairs TO authenticated;
GRANT ALL ON public.couple_pairs TO service_role;
ALTER TABLE public.couple_pairs ENABLE ROW LEVEL SECURITY;

-- Helper: is this user a member of pair?
CREATE OR REPLACE FUNCTION public.is_pair_member(_pair_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_pairs
    WHERE id = _pair_id AND (user_a = _user_id OR user_b = _user_id)
  );
$$;

-- Helper: pair id for a given user (null if unpaired)
CREATE OR REPLACE FUNCTION public.my_pair_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.couple_pairs
  WHERE user_a = _user_id OR user_b = _user_id
  LIMIT 1;
$$;

CREATE POLICY "pair members can view"
ON public.couple_pairs FOR SELECT TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "pair members can delete"
ON public.couple_pairs FOR DELETE TO authenticated
USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "anyone authenticated can create when accepting invite"
ON public.couple_pairs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- Invite codes
CREATE TABLE public.couple_invites (
  code text PRIMARY KEY,
  inviter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couple_invites TO authenticated;
GRANT ALL ON public.couple_invites TO service_role;
ALTER TABLE public.couple_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inviter can manage"
ON public.couple_invites FOR ALL TO authenticated
USING (auth.uid() = inviter_id)
WITH CHECK (auth.uid() = inviter_id);

-- Any authenticated user can look up a code to redeem
CREATE POLICY "authenticated can read codes to redeem"
ON public.couple_invites FOR SELECT TO authenticated
USING (true);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.couple_pairs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_pair_created ON public.messages(pair_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pair members read messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_pair_member(pair_id, auth.uid()));

CREATE POLICY "members can send"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_pair_member(pair_id, auth.uid()));

CREATE POLICY "sender can delete own"
ON public.messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Storage policies for chat-media (path = <pair_id>/<sender_id>/<file>)
CREATE POLICY "pair members read chat media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.is_pair_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "pair members upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND public.is_pair_member(((storage.foldername(name))[1])::uuid, auth.uid())
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
);

CREATE POLICY "sender can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-media'
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
);
