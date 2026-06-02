
REVOKE EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_pair_id(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pair_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_pair_id(uuid) TO service_role;
