ALTER TABLE public.track_comments
  ADD COLUMN track_version_id uuid REFERENCES public.track_versions(id);
