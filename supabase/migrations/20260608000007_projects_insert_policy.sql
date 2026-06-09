-- Any authenticated user can create a project (they become the owner)
-- Policy already exists from init migration; CREATE OR REPLACE not supported for policies,
-- so we drop+recreate idempotently.
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
