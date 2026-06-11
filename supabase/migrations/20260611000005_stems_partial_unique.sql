-- The full unique constraint blocks re-upload when a soft-deleted stem already
-- exists for the same (track_id, track_version_id). Replace it with a partial
-- unique index that only enforces uniqueness among non-deleted rows.
ALTER TABLE public.stems DROP CONSTRAINT IF EXISTS stems_track_version_unique;

CREATE UNIQUE INDEX IF NOT EXISTS stems_track_version_unique
  ON public.stems (track_id, track_version_id)
  WHERE deleted_at IS NULL;
