-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────
CREATE POLICY "Projects viewable by owner or collaborator"
  ON public.projects FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Main artist can update project"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND is_main_artist = true
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can delete project"
  ON public.projects FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND is_main_artist = true
        AND removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- COLLABORATORS
-- ─────────────────────────────────────────────
CREATE POLICY "Collaborators viewable by project members"
  ON public.collaborators FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c2
      WHERE c2.project_id = collaborators.project_id
        AND c2.user_id = auth.uid()
        AND c2.removed_at IS NULL
    )
  );

CREATE POLICY "Project owner or main artist can add collaborators"
  ON public.collaborators FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.collaborators c2
      WHERE c2.project_id = project_id
        AND c2.user_id = auth.uid()
        AND c2.is_main_artist = true
        AND c2.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist or self can update collaborator"
  ON public.collaborators FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.collaborators c2
      WHERE c2.project_id = collaborators.project_id
        AND c2.user_id = auth.uid()
        AND c2.is_main_artist = true
        AND c2.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can delete collaborator"
  ON public.collaborators FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c2
      WHERE c2.project_id = collaborators.project_id
        AND c2.user_id = auth.uid()
        AND c2.is_main_artist = true
        AND c2.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- TRACKS
-- ─────────────────────────────────────────────
CREATE POLICY "Tracks viewable by project collaborators"
  ON public.tracks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tracks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add tracks"
  ON public.tracks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tracks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can update tracks"
  ON public.tracks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tracks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can delete tracks"
  ON public.tracks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tracks.project_id
        AND user_id = auth.uid()
        AND is_main_artist = true
        AND removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- TRACK VERSIONS
-- ─────────────────────────────────────────────
CREATE POLICY "Track versions viewable by collaborators"
  ON public.track_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_versions.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add track versions"
  ON public.track_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_versions.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can update track versions"
  ON public.track_versions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = track_versions.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- STEMS
-- ─────────────────────────────────────────────
CREATE POLICY "Stems viewable by project collaborators"
  ON public.stems FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = stems.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add stems"
  ON public.stems FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = stems.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can update stems"
  ON public.stems FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = stems.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can delete stems"
  ON public.stems FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = stems.track_id
        AND c.user_id = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- STEM VERSIONS
-- ─────────────────────────────────────────────
CREATE POLICY "Stem versions viewable by collaborators"
  ON public.stem_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stems s
      JOIN public.tracks t ON t.id = s.track_id
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE s.id = stem_versions.stem_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can add stem versions"
  ON public.stem_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stems s
      JOIN public.tracks t ON t.id = s.track_id
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE s.id = stem_versions.stem_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
CREATE POLICY "Tasks viewable by project collaborators"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tasks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tasks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tasks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = tasks.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- TASK DEPENDENCIES
-- ─────────────────────────────────────────────
CREATE POLICY "Task dependencies viewable by collaborators"
  ON public.task_dependencies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can manage task dependencies"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can delete task dependencies"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = task_dependencies.task_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- SPLITS
-- ─────────────────────────────────────────────
CREATE POLICY "Splits viewable by project collaborators"
  ON public.splits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = splits.track_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can manage splits"
  ON public.splits FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = splits.track_id
        AND c.user_id = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can update splits"
  ON public.splits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = splits.track_id
        AND c.user_id = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  );

CREATE POLICY "Main artist can delete splits"
  ON public.splits FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tracks t
      JOIN public.collaborators c ON c.project_id = t.project_id
      WHERE t.id = splits.track_id
        AND c.user_id = auth.uid()
        AND c.is_main_artist = true
        AND c.removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────
CREATE POLICY "Chat viewable by project collaborators"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = chat_messages.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Collaborators can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = chat_messages.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

CREATE POLICY "Users can soft-delete own messages"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE POLICY "Collaborators can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE project_id = audit_logs.project_id
        AND user_id = auth.uid()
        AND removed_at IS NULL
    )
  );

-- ─────────────────────────────────────────────
-- USER AGENT PREFERENCES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can manage own agent preferences"
  ON public.user_agent_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- REFERENCE TABLES (read-only for all authenticated)
-- ─────────────────────────────────────────────
CREATE POLICY "Authenticated users can view role definitions"
  ON public.collaborator_role_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view roadmap templates"
  ON public.roadmap_templates FOR SELECT TO authenticated
  USING (true);
