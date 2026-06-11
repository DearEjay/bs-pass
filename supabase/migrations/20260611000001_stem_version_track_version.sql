-- Link each stem version to the track version it was uploaded against.
-- Enforces the 1-to-1 rule: one stem version per stem per track version.

ALTER TABLE public.stem_versions
  ADD COLUMN track_version_id uuid REFERENCES public.track_versions(id);

ALTER TABLE public.stem_versions
  ADD CONSTRAINT stem_versions_stem_track_version_unique
  UNIQUE (stem_id, track_version_id);

-- Grants (stem_versions already had SELECT/INSERT from rls_policies migration;
-- the new column is automatically included — no extra GRANT needed)
