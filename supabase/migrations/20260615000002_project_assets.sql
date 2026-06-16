-- Replace per-track assets with project-level assets.
-- track_assets was just created and has no data yet.

DROP TABLE IF EXISTS public.track_assets;

CREATE TABLE IF NOT EXISTS public.project_assets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_type   text        NOT NULL CHECK (asset_type IN ('file', 'link')),
  name         text        NOT NULL,
  storage_path text,
  external_url text,
  file_size    bigint,
  mime_type    text,
  uploader_id  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT project_assets_file_requires_path CHECK (asset_type <> 'file' OR storage_path IS NOT NULL),
  CONSTRAINT project_assets_link_requires_url  CHECK (asset_type <> 'link' OR external_url  IS NOT NULL)
);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collaborators can view project assets"
  ON public.project_assets FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = project_assets.project_id
        AND user_id    = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add project assets"
  ON public.project_assets FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = project_assets.project_id
        AND user_id    = auth.uid()
        AND removed_at IS NULL
    )
  );

-- Uploader OR main artist can soft-delete
CREATE POLICY "Uploader or main artist can remove project assets"
  ON public.project_assets FOR UPDATE
  USING (
    uploader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id     = project_assets.project_id
        AND user_id        = auth.uid()
        AND is_main_artist = true
        AND removed_at     IS NULL
    )
  );
