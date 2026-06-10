-- ─────────────────────────────────────────────────────────────────────────────
-- RPC FUNCTIONS: Public invite + signature lookup by token (SECURITY DEFINER)
-- These allow anon users to fetch safe invite/split details without RLS bypass
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns safe invite details for the acceptance page (no sensitive PII)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check pending_invites (unregistered user)
  SELECT jsonb_build_object(
    'source',        'pending',
    'project_title', proj.title,
    'project_id',    proj.id::text,
    'roles',         pi.roles,
    'expires_at',    pi.expires_at::text
  ) INTO result
  FROM public.pending_invites pi
  JOIN public.projects proj ON proj.id = pi.project_id
  WHERE pi.invite_token = p_token
    AND pi.accepted_at IS NULL
    AND pi.expires_at > now()
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Check collaborators (registered user)
  SELECT jsonb_build_object(
    'source',         'registered',
    'project_title',  proj.title,
    'project_id',     proj.id::text,
    'collaborator_id',c.id::text,
    'roles',          c.roles
  ) INTO result
  FROM public.collaborators c
  JOIN public.projects proj ON proj.id = c.project_id
  WHERE c.invite_token = p_token
    AND c.status = 'invited'
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Returns safe split details for the signature page
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_split_by_token(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
  other_splits JSONB;
BEGIN
  -- Get all other splits for context (names + percentages only, no PII)
  SELECT jsonb_agg(jsonb_build_object(
    'display_name', pr.display_name,
    'percentage',   os.percentage
  )) INTO other_splits
  FROM public.splits os
  JOIN public.collaborators oc ON oc.id = os.collaborator_id
  JOIN public.profiles pr ON pr.id = oc.user_id
  WHERE os.track_id = (
    SELECT s2.track_id FROM public.splits s2
    WHERE s2.signature_token = p_token LIMIT 1
  )
    AND os.signature_token != p_token;

  SELECT jsonb_build_object(
    'split_id',           s.id::text,
    'track_id',           s.track_id::text,
    'track_title',        t.title,
    'project_title',      proj.title,
    'percentage',         s.percentage,
    'split_status',       s.split_status,
    'token_expires_at',   s.token_expires_at::text,
    'collaborator_user_id', c.user_id::text,
    'other_splits',       COALESCE(other_splits, '[]'::jsonb)
  ) INTO result
  FROM public.splits s
  JOIN public.tracks t ON t.id = s.track_id
  JOIN public.projects proj ON proj.id = t.project_id
  JOIN public.collaborators c ON c.id = s.collaborator_id
  WHERE s.signature_token = p_token
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_split_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_split_by_token(TEXT) TO authenticated;
