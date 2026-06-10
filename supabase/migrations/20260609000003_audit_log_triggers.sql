-- Audit log trigger
-- Fires on INSERT / UPDATE / DELETE for key tables.
-- Only logs authenticated user requests (auth.uid() IS NOT NULL).
-- Agent writes via service role have NULL auth.uid() and are logged by Edge Functions.

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_entity_id  UUID;
  v_project_id UUID;
  v_action     TEXT;
  v_diff       JSONB;
  v_old        JSONB;
  v_new        JSONB;
BEGIN
  v_actor_id := auth.uid();

  -- Skip service-role writes (agent actions logged by Edge Functions)
  IF v_actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ── Build JSONB snapshots ──────────────────────────────────────────────────
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_entity_id  := (v_old->>'id')::UUID;
    v_project_id := CASE WHEN TG_TABLE_NAME = 'projects'
                         THEN v_entity_id
                         ELSE (v_old->>'project_id')::UUID END;
    v_action := 'deleted';
    v_diff := NULL;

  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_entity_id  := (v_new->>'id')::UUID;
    v_project_id := CASE WHEN TG_TABLE_NAME = 'projects'
                         THEN v_entity_id
                         ELSE (v_new->>'project_id')::UUID END;
    v_action := 'created';
    -- Store initial values, strip noise
    v_diff := v_new - 'created_at' - 'updated_at' - 'deleted_at';

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id  := (v_new->>'id')::UUID;
    v_project_id := CASE WHEN TG_TABLE_NAME = 'projects'
                         THEN v_entity_id
                         ELSE (v_new->>'project_id')::UUID END;

    -- Soft delete (deleted_at transitions null → non-null)
    IF (v_new->>'deleted_at') IS NOT NULL
       AND (v_old->>'deleted_at') IS NULL THEN
      v_action := 'deleted';
      v_diff := NULL;

    -- Track status change
    ELSIF TG_TABLE_NAME = 'tracks'
      AND (v_old->>'current_status') IS DISTINCT FROM (v_new->>'current_status') THEN
      v_action := 'status_changed';
      v_diff := jsonb_build_object(
        'from', v_old->>'current_status',
        'to',   v_new->>'current_status'
      );

    -- Split: collaborator signs
    ELSIF TG_TABLE_NAME = 'splits'
      AND (v_old->>'signed_at') IS NULL
      AND (v_new->>'signed_at') IS NOT NULL THEN
      v_action := 'signed';
      v_diff := jsonb_build_object(
        'signed_at', v_new->>'signed_at',
        'signed_ip', v_new->>'signed_ip'
      );

    ELSE
      -- Generic update: record per-column before/after for every changed column
      SELECT jsonb_object_agg(
               key,
               jsonb_build_object('from', v_old->key, 'to', value)
             )
      INTO v_diff
      FROM jsonb_each(v_new)
      WHERE (v_old->key) IS DISTINCT FROM value
        AND key NOT IN ('updated_at', 'created_at');

      -- Skip if the only thing that changed was a timestamp
      IF v_diff IS NULL OR v_diff = '{}'::jsonb THEN
        RETURN NEW;
      END IF;

      v_action := 'updated';
    END IF;
  END IF;

  INSERT INTO public.audit_logs
    (project_id, actor_id, actor_type, entity_type, entity_id, action, diff)
  VALUES
    (v_project_id, v_actor_id, 'user', TG_TABLE_NAME, v_entity_id, v_action, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach to tables ──────────────────────────────────────────────────────────

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_tracks
  AFTER INSERT OR UPDATE OR DELETE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_collaborators
  AFTER INSERT OR UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_splits
  AFTER INSERT OR UPDATE ON public.splits
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_stems
  AFTER INSERT OR UPDATE OR DELETE ON public.stems
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
