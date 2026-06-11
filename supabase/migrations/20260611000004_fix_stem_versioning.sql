-- The track_version relationship belongs on stems (one package per track version),
-- not on stem_versions (which are the upload history of a package).
-- Remove the erroneous column + constraint from stem_versions.
ALTER TABLE public.stem_versions
  DROP CONSTRAINT IF EXISTS stem_versions_stem_track_version_unique;

ALTER TABLE public.stem_versions
  DROP COLUMN IF EXISTS track_version_id;

-- Enforce the real 1:1: one stems package per track version.
ALTER TABLE public.stems
  ADD CONSTRAINT stems_track_version_unique UNIQUE (track_id, track_version_id);
