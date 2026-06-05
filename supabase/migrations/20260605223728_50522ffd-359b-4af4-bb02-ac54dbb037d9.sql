
-- 1) couple_invites: remove broad SELECT, add scoped redeem RPC
DROP POLICY IF EXISTS "authenticated can read codes to redeem" ON public.couple_invites;

CREATE OR REPLACE FUNCTION public.redeem_couple_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.couple_invites%ROWTYPE;
  new_pair_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.couple_invites WHERE code = _code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Code already used';
  END IF;
  IF inv.inviter_id = uid THEN
    RAISE EXCEPTION 'That is your own code';
  END IF;

  INSERT INTO public.couple_pairs (user_a, user_b)
  VALUES (inv.inviter_id, uid)
  RETURNING id INTO new_pair_id;

  UPDATE public.couple_invites SET used_at = now() WHERE code = _code;

  RETURN new_pair_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_couple_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_couple_invite(text) TO authenticated;

-- 2) chat-media storage: add explicit UPDATE policy scoped to the sender folder
DROP POLICY IF EXISTS "sender can update own chat media" ON storage.objects;
CREATE POLICY "sender can update own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
)
WITH CHECK (
  bucket_id = 'chat-media'
  AND ((storage.foldername(name))[2])::uuid = auth.uid()
);

-- 3) Realtime channel authorization: only pair members can subscribe to their pair topic
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pair members can subscribe to pair topic" ON realtime.messages;
CREATE POLICY "pair members can subscribe to pair topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- topic format: "messages-<pair_id>" or "public:messages" (postgres_changes default)
  CASE
    WHEN realtime.topic() LIKE 'messages-%' THEN
      public.is_pair_member(
        NULLIF(substring(realtime.topic() FROM 'messages-(.*)'), '')::uuid,
        (SELECT auth.uid())
      )
    ELSE false
  END
);

-- 4) Restrict internal SECURITY DEFINER helpers from anonymous callers.
-- Authenticated users still need EXECUTE because these are referenced by RLS policies.
REVOKE ALL ON FUNCTION public.my_pair_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pair_id(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_pair_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_partner_of(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partner_of(uuid, uuid) TO authenticated;

-- Trigger-only functions: no client should call them directly.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
