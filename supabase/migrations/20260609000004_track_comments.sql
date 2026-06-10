-- track_comments: timestamp-anchored comments on audio tracks
CREATE TABLE public.track_comments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id       UUID NOT NULL REFERENCES public.tracks(id)  ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id      UUID NOT NULL REFERENCES public.profiles(id),
  body           TEXT NOT NULL,
  timestamp_secs NUMERIC(10,3) NOT NULL,
  deleted_at     TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;

-- updated_at auto-management
CREATE TRIGGER set_track_comments_updated_at
  BEFORE UPDATE ON public.track_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Audit log trigger (user writes only; service-role writes skipped by trigger)
CREATE TRIGGER audit_track_comments
  AFTER INSERT OR UPDATE ON public.track_comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- Collaborators on the project can read all non-deleted comments
CREATE POLICY "collaborators_read_track_comments" ON public.track_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.project_id = track_comments.project_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- Collaborators can insert comments attributed to themselves
CREATE POLICY "collaborators_insert_track_comments" ON public.track_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.project_id = track_comments.project_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- Authors can edit body or soft-delete (set deleted_at) their own comments
CREATE POLICY "authors_update_track_comments" ON public.track_comments
  FOR UPDATE USING (author_id = auth.uid());
