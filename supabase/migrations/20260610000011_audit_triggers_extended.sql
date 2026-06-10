-- Allow authenticated users to INSERT application-level semantic audit entries
-- (e.g. "splits_changed_signatures_voided" from useSplits.ts).
-- DB-level trigger inserts use SECURITY DEFINER and bypass RLS; this policy
-- covers client-side application inserts that add richer semantic context.
-- UPDATE and DELETE remain blocked (no policy exists for those operations).
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_type = 'user');

-- Extend audit log coverage to tables not covered by the original trigger set:
-- track_versions, task_dependencies, pending_invites, chat_messages.
--
-- track_versions / task_dependencies lack a project_id column, so we look it up
-- from the parent table. Functions are SECURITY DEFINER so they can always INSERT
-- into audit_logs regardless of the caller's RLS context.

-- ── track_versions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_log_track_version_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_project_id UUID;
  v_row        JSONB;
  v_old        JSONB;
  v_action     TEXT;
  v_diff       JSONB;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
    SELECT project_id INTO v_project_id FROM tracks WHERE id = (v_row->>'track_id')::UUID;
    v_action := 'deleted';
    v_diff := jsonb_build_object(
      'track_id', v_row->>'track_id',
      'version_label', v_row->>'version_label'
    );

  ELSIF TG_OP = 'INSERT' THEN
    v_row := to_jsonb(NEW);
    SELECT project_id INTO v_project_id FROM tracks WHERE id = (v_row->>'track_id')::UUID;
    v_action := 'created';
    v_diff := v_row - 'created_at' - 'updated_at';

  ELSE -- UPDATE
    v_row := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    SELECT project_id INTO v_project_id FROM tracks WHERE id = (v_row->>'track_id')::UUID;
    SELECT jsonb_object_agg(key, jsonb_build_object('from', v_old->key, 'to', value))
    INTO v_diff
    FROM jsonb_each(v_row)
    WHERE (v_old->key) IS DISTINCT FROM value
      AND key NOT IN ('updated_at', 'created_at');

    IF v_diff IS NULL OR v_diff = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    v_action := 'updated';
  END IF;

  INSERT INTO public.audit_logs
    (project_id, actor_id, actor_type, entity_type, entity_id, action, diff)
  VALUES
    (v_project_id, v_actor_id, 'user', 'track_versions', (v_row->>'id')::UUID, v_action, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_track_versions
  AFTER INSERT OR UPDATE OR DELETE ON public.track_versions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_track_version_trigger();

-- ── task_dependencies ──────────────────────────────────────────────────────
-- No id column — use task_id as entity_id.

CREATE OR REPLACE FUNCTION public.audit_log_task_dep_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_project_id UUID;
  v_row        JSONB;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_row := CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT project_id INTO v_project_id FROM tasks WHERE id = (v_row->>'task_id')::UUID;

  INSERT INTO public.audit_logs
    (project_id, actor_id, actor_type, entity_type, entity_id, action, diff)
  VALUES (
    v_project_id,
    v_actor_id,
    'user',
    'task_dependencies',
    (v_row->>'task_id')::UUID,
    CASE TG_OP WHEN 'DELETE' THEN 'deleted' ELSE 'created' END,
    v_row
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_task_dependencies
  AFTER INSERT OR DELETE ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_task_dep_trigger();

-- ── pending_invites ────────────────────────────────────────────────────────
-- Has project_id — reuse the existing generic trigger function.

CREATE TRIGGER audit_pending_invites
  AFTER INSERT OR UPDATE OR DELETE ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ── chat_messages ──────────────────────────────────────────────────────────
-- Has project_id — reuse the existing generic trigger function.
-- Captures all message inserts (user + agent) and soft-delete updates (is_deleted flag).

CREATE TRIGGER audit_chat_messages
  AFTER INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
