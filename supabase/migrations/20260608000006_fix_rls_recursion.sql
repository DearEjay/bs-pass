-- ─────────────────────────────────────────────
-- Helper functions (SECURITY DEFINER bypasses RLS so no recursion)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND removed_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_main_artist(p_project_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND is_main_artist = true
      AND removed_at IS NULL
  );
$$;

-- ─────────────────────────────────────────────
-- Drop all old policies and rewrite using helper functions
-- ─────────────────────────────────────────────

-- PROJECTS
DROP POLICY IF EXISTS "Projects viewable by owner or collaborator" ON public.projects;
DROP POLICY IF EXISTS "Main artist can update project" ON public.projects;
DROP POLICY IF EXISTS "Main artist can delete project" ON public.projects;

CREATE POLICY "Projects viewable by owner or collaborator"
  ON public.projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_project_member(id));

CREATE POLICY "Main artist can update project"
  ON public.projects FOR UPDATE TO authenticated
  USING (is_project_main_artist(id));

CREATE POLICY "Main artist can delete project"
  ON public.projects FOR DELETE TO authenticated
  USING (is_project_main_artist(id));

-- COLLABORATORS (was the recursive one)
DROP POLICY IF EXISTS "Collaborators viewable by project members" ON public.collaborators;
DROP POLICY IF EXISTS "Project owner or main artist can add collaborators" ON public.collaborators;
DROP POLICY IF EXISTS "Main artist or self can update collaborator" ON public.collaborators;
DROP POLICY IF EXISTS "Main artist can delete collaborator" ON public.collaborators;

CREATE POLICY "Collaborators viewable by project members"
  ON public.collaborators FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_project_member(project_id));

CREATE POLICY "Project owner or main artist can add collaborators"
  ON public.collaborators FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid())
    OR is_project_main_artist(project_id)
  );

CREATE POLICY "Main artist or self can update collaborator"
  ON public.collaborators FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_project_main_artist(project_id));

CREATE POLICY "Main artist can delete collaborator"
  ON public.collaborators FOR DELETE TO authenticated
  USING (is_project_main_artist(project_id));

-- TRACKS
DROP POLICY IF EXISTS "Tracks viewable by project collaborators" ON public.tracks;
DROP POLICY IF EXISTS "Collaborators can add tracks" ON public.tracks;
DROP POLICY IF EXISTS "Collaborators can update tracks" ON public.tracks;
DROP POLICY IF EXISTS "Main artist can delete tracks" ON public.tracks;

CREATE POLICY "Tracks viewable by project collaborators"
  ON public.tracks FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "Collaborators can add tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Collaborators can update tracks"
  ON public.tracks FOR UPDATE TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "Main artist can delete tracks"
  ON public.tracks FOR DELETE TO authenticated
  USING (is_project_main_artist(project_id));

-- TRACK VERSIONS
DROP POLICY IF EXISTS "Track versions viewable by collaborators" ON public.track_versions;
DROP POLICY IF EXISTS "Collaborators can add track versions" ON public.track_versions;
DROP POLICY IF EXISTS "Collaborators can update track versions" ON public.track_versions;

CREATE POLICY "Track versions viewable by collaborators"
  ON public.track_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can add track versions"
  ON public.track_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can update track versions"
  ON public.track_versions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

-- STEMS
DROP POLICY IF EXISTS "Stems viewable by project collaborators" ON public.stems;
DROP POLICY IF EXISTS "Collaborators can add stems" ON public.stems;
DROP POLICY IF EXISTS "Collaborators can update stems" ON public.stems;
DROP POLICY IF EXISTS "Main artist can delete stems" ON public.stems;

CREATE POLICY "Stems viewable by project collaborators"
  ON public.stems FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can add stems"
  ON public.stems FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can update stems"
  ON public.stems FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Main artist can delete stems"
  ON public.stems FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_main_artist(t.project_id)));

-- STEM VERSIONS
DROP POLICY IF EXISTS "Stem versions viewable by collaborators" ON public.stem_versions;
DROP POLICY IF EXISTS "Collaborators can add stem versions" ON public.stem_versions;

CREATE POLICY "Stem versions viewable by collaborators"
  ON public.stem_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stems s JOIN public.tracks t ON t.id = s.track_id
    WHERE s.id = stem_id AND is_project_member(t.project_id)
  ));

CREATE POLICY "Collaborators can add stem versions"
  ON public.stem_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stems s JOIN public.tracks t ON t.id = s.track_id
    WHERE s.id = stem_id AND is_project_member(t.project_id)
  ));

-- TASKS
DROP POLICY IF EXISTS "Tasks viewable by project collaborators" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can delete tasks" ON public.tasks;

CREATE POLICY "Tasks viewable by project collaborators"
  ON public.tasks FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "Collaborators can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (is_project_member(project_id));

CREATE POLICY "Collaborators can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "Collaborators can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (is_project_member(project_id));

-- TASK DEPENDENCIES
DROP POLICY IF EXISTS "Task dependencies viewable by collaborators" ON public.task_dependencies;
DROP POLICY IF EXISTS "Collaborators can manage task dependencies" ON public.task_dependencies;
DROP POLICY IF EXISTS "Collaborators can delete task dependencies" ON public.task_dependencies;

CREATE POLICY "Task dependencies viewable by collaborators"
  ON public.task_dependencies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can manage task dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id)));

CREATE POLICY "Collaborators can delete task dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND is_project_member(t.project_id)));

-- SPLITS
DROP POLICY IF EXISTS "Splits viewable by project collaborators" ON public.splits;
DROP POLICY IF EXISTS "Main artist can manage splits" ON public.splits;
DROP POLICY IF EXISTS "Main artist can update splits" ON public.splits;
DROP POLICY IF EXISTS "Main artist can delete splits" ON public.splits;

CREATE POLICY "Splits viewable by project collaborators"
  ON public.splits FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_member(t.project_id)));

CREATE POLICY "Main artist can manage splits"
  ON public.splits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_main_artist(t.project_id)));

CREATE POLICY "Main artist can update splits"
  ON public.splits FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_main_artist(t.project_id)));

CREATE POLICY "Main artist can delete splits"
  ON public.splits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND is_project_main_artist(t.project_id)));

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Chat viewable by project collaborators" ON public.chat_messages;
DROP POLICY IF EXISTS "Collaborators can send messages" ON public.chat_messages;

CREATE POLICY "Chat viewable by project collaborators"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (is_project_member(project_id));

CREATE POLICY "Collaborators can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_project_member(project_id));

-- AUDIT LOGS
DROP POLICY IF EXISTS "Collaborators can view audit logs" ON public.audit_logs;

CREATE POLICY "Collaborators can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (project_id IS NULL OR is_project_member(project_id));
