-- Allow collaborators to hard-delete track versions
CREATE POLICY "Collaborators can delete track versions"
  ON public.track_versions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_versions.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );
