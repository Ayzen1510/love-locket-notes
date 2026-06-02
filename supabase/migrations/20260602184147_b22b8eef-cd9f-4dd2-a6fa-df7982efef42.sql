
-- Helper: returns true if two users belong to the same couple pair
CREATE OR REPLACE FUNCTION public.is_partner_of(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_pairs
    WHERE (user_a = _owner AND user_b = _viewer)
       OR (user_b = _owner AND user_a = _viewer)
  );
$$;

-- ============ MEMORIES ============
DROP POLICY IF EXISTS "own memories select" ON public.memories;
DROP POLICY IF EXISTS "own memories update" ON public.memories;
DROP POLICY IF EXISTS "own memories delete" ON public.memories;

CREATE POLICY "pair memories select" ON public.memories
FOR SELECT USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

CREATE POLICY "pair memories update" ON public.memories
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

CREATE POLICY "pair memories delete" ON public.memories
FOR DELETE USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

-- ============ MEMORY IMAGES ============
DROP POLICY IF EXISTS "own images select" ON public.memory_images;
DROP POLICY IF EXISTS "own images update" ON public.memory_images;
DROP POLICY IF EXISTS "own images delete" ON public.memory_images;
DROP POLICY IF EXISTS "own images insert" ON public.memory_images;

CREATE POLICY "pair images select" ON public.memory_images
FOR SELECT USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

CREATE POLICY "pair images insert" ON public.memory_images
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

CREATE POLICY "pair images update" ON public.memory_images
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

CREATE POLICY "pair images delete" ON public.memory_images
FOR DELETE USING (
  auth.uid() = user_id OR public.is_partner_of(user_id, auth.uid())
);

-- ============ PROFILES (let partner view) ============
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "pair profile select" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.is_partner_of(id, auth.uid())
);

-- ============ STORAGE: memory-images bucket ============
-- Paths are: <user_id>/<memory_id>/<filename> OR <user_id>/_mood/<filename>
DROP POLICY IF EXISTS "memory-images owner select" ON storage.objects;
DROP POLICY IF EXISTS "memory-images owner insert" ON storage.objects;
DROP POLICY IF EXISTS "memory-images owner update" ON storage.objects;
DROP POLICY IF EXISTS "memory-images owner delete" ON storage.objects;
DROP POLICY IF EXISTS "memory-images pair select" ON storage.objects;
DROP POLICY IF EXISTS "memory-images pair insert" ON storage.objects;
DROP POLICY IF EXISTS "memory-images pair update" ON storage.objects;
DROP POLICY IF EXISTS "memory-images pair delete" ON storage.objects;

CREATE POLICY "memory-images pair select" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'memory-images' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "memory-images pair insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'memory-images' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "memory-images pair update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'memory-images' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "memory-images pair delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'memory-images' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_partner_of(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);
