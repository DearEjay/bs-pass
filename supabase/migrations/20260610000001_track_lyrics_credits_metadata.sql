-- Add per-track fields for Lyrics, Credits, and Metadata subtabs
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS lyrics           TEXT,
  ADD COLUMN IF NOT EXISTS release_date     DATE,
  ADD COLUMN IF NOT EXISTS track_cover_url  TEXT;

-- ─────────────────────────────────────────────────────────────
-- TRACK CREDITS  (name + role rows per track)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.track_credits (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id   UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.track_credits ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_track_credits_updated_at
  BEFORE UPDATE ON public.track_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Any collaborator on the project can read / write credits
CREATE POLICY "collaborators_select_track_credits" ON public.track_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_credits.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "collaborators_insert_track_credits" ON public.track_credits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_credits.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "collaborators_update_track_credits" ON public.track_credits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_credits.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "collaborators_delete_track_credits" ON public.track_credits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_credits.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_credits TO authenticated;
