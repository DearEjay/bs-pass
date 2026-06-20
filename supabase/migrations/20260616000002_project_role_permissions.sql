-- ── project_role_permissions ─────────────────────────────────────────────────
-- Per-project RBAC matrix.  The project owner (main artist) always has full
-- access — their row is never stored here.  All other roles default to the
-- values seeded by the frontend hook on first load, and the owner can override
-- any cell from the Permissions tab in project settings.

CREATE TABLE IF NOT EXISTS public.project_role_permissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_name    text        NOT NULL,
  resource     text        NOT NULL,
  can_view     boolean     NOT NULL DEFAULT false,
  can_edit     boolean     NOT NULL DEFAULT false,
  can_delete   boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_resource CHECK (resource IN ('tracks','stems','splits','tasks','assets','chat')),
  UNIQUE (project_id, role_name, resource)
);

ALTER TABLE public.project_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view permissions"
  ON public.project_role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = project_role_permissions.project_id
        AND user_id    = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can insert permissions"
  ON public.project_role_permissions FOR INSERT
  WITH CHECK (is_project_main_artist(project_id));

CREATE POLICY "Main artist can update permissions"
  ON public.project_role_permissions FOR UPDATE
  USING (is_project_main_artist(project_id));

CREATE POLICY "Main artist can delete permissions"
  ON public.project_role_permissions FOR DELETE
  USING (is_project_main_artist(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_role_permissions TO authenticated;

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_role_permissions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
