-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: COLLABORATION + SPLITS
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add invite_token to collaborators (registered-user invite flow)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_collaborators_invite_token
  ON public.collaborators(invite_token)
  WHERE invite_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PENDING INVITES — for emails not yet registered in the system
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  roles        TEXT[] NOT NULL DEFAULT '{}',
  invite_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  invited_by   UUID NOT NULL REFERENCES public.profiles(id),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, email)
);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_pending_invites_updated_at
  BEFORE UPDATE ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Main artist can manage pending invites for their projects
CREATE POLICY "main_artist_manage_pending_invites"
  ON public.pending_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.project_id = pending_invites.project_id
        AND c.user_id    = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.project_id = pending_invites.project_id
        AND c.user_id    = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_pending_invites_token
  ON public.pending_invites(invite_token);

CREATE INDEX IF NOT EXISTS idx_pending_invites_email
  ON public.pending_invites(email)
  WHERE accepted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add splits_agent_locked to tracks (track-level: disables agent auto-populate)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS splits_agent_locked BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add split_status to splits (explicit status for badge rendering)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.splits
  ADD COLUMN IF NOT EXISTS split_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (split_status IN ('pending', 'signed', 'voided'));

-- Backfill: rows that already have signed_at set should be 'signed'
UPDATE public.splits
  SET split_status = 'signed'
  WHERE signed_at IS NOT NULL AND split_status = 'pending';
