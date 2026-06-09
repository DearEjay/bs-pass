-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Authenticated users: full CRUD on all public tables (RLS policies enforce row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anon: read-only on reference tables only
GRANT SELECT ON public.collaborator_role_definitions TO anon;
GRANT SELECT ON public.roadmap_templates TO anon;
