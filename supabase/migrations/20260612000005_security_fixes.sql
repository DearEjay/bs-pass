-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY FIX 1: Restrict email-lookup functions to service_role only.
-- Without REVOKE, SECURITY DEFINER functions in public schema are callable
-- by any authenticated user, allowing email enumeration via user ID lookup.
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_emails_by_user_ids(UUID[])   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT)       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_emails_by_user_ids(UUID[])   FROM authenticated;
-- service_role grant already exists from migration 20260610000008; keep it.


-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY FIX 2: Tighten Storage RLS for private audio buckets.
-- Old policies: any authenticated user could read/write tracks and stems.
-- New policies: only active collaborators on the owning project may access.
--
-- Path convention expected:
--   tracks  →  {project_id}/versions/{track_id}/{filename}
--   stems   →  {project_id}/tracks/{track_id}/stems/{filename}
-- We extract project_id as the FIRST path segment to enforce membership.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: is the caller an active collaborator on the project whose ID
-- matches the first path segment of a storage object?
CREATE OR REPLACE FUNCTION public.is_project_collaborator_from_path(object_name TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collaborators c
    WHERE c.project_id = (split_part(object_name, '/', 1))::uuid
      AND c.user_id    = auth.uid()
      AND c.removed_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_collaborator_from_path(TEXT) TO authenticated;

-- ── Tracks bucket ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view tracks"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload tracks"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update tracks"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete tracks"  ON storage.objects;

CREATE POLICY "Collaborators can view tracks"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tracks' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can upload tracks"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tracks' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can update tracks"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tracks' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can delete tracks"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tracks' AND public.is_project_collaborator_from_path(name));

-- ── Stems bucket ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view stems"    ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stems"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update stems"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete stems"  ON storage.objects;

CREATE POLICY "Collaborators can view stems"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stems' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can upload stems"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stems' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can update stems"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stems' AND public.is_project_collaborator_from_path(name));

CREATE POLICY "Collaborators can delete stems"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stems' AND public.is_project_collaborator_from_path(name));
