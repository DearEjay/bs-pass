-- Grant CRUD privileges to authenticated role on project_assets.
-- The table was created without the default privilege set that earlier tables benefit from.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;
GRANT SELECT ON public.project_assets TO anon;
