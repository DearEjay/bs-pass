-- ── track_assets ──────────────────────────────────────────────────────────────
-- Stores uploaded files and external links attached to a track.

CREATE TABLE IF NOT EXISTS public.track_assets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id     uuid        NOT NULL REFERENCES public.tracks(id)   ON DELETE CASCADE,
  project_id   uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_type   text        NOT NULL CHECK (asset_type IN ('file', 'link')),
  name         text        NOT NULL,
  storage_path text,       -- populated for file assets
  external_url text,       -- populated for link assets
  file_size    bigint,     -- bytes
  mime_type    text,
  uploader_id  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

ALTER TABLE public.track_assets
  ADD CONSTRAINT track_assets_file_requires_path
    CHECK (asset_type <> 'file' OR storage_path IS NOT NULL),
  ADD CONSTRAINT track_assets_link_requires_url
    CHECK (asset_type <> 'link' OR external_url IS NOT NULL);

ALTER TABLE public.track_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view track assets"
  ON public.track_assets FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = track_assets.project_id
        AND user_id    = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add track assets"
  ON public.track_assets FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = track_assets.project_id
        AND user_id    = auth.uid()
        AND removed_at IS NULL
    )
  );

-- Uploader OR main artist can soft-delete
CREATE POLICY "Uploader or main artist can remove track assets"
  ON public.track_assets FOR UPDATE
  USING (
    uploader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id   = track_assets.project_id
        AND user_id      = auth.uid()
        AND is_main_artist = true
        AND removed_at   IS NULL
    )
  );

-- ── Storage bucket ─────────────────────────────────────────────────────────────
-- Any file type, 100 MB limit per file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('track-assets', 'track-assets', false, 104857600, null)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view track assets storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'track-assets');

CREATE POLICY "Authenticated users can upload track assets storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'track-assets');

CREATE POLICY "Authenticated users can delete track assets storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'track-assets');
