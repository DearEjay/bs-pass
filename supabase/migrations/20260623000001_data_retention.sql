-- ── Data Retention ──────────────────────────────────────────────────────────
-- Requires pg_cron extension (enabled by default on Supabase Pro/Team plans).
-- On the free tier, enable it in the Supabase dashboard → Database → Extensions.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 1. Purge hard-deleted (soft-delete) rows older than 90 days ──────────────
-- These rows accumulate indefinitely otherwise. 90 days provides a safety
-- window for accidental deletions before permanent removal.
SELECT cron.schedule(
  'purge-soft-deletes',
  '0 3 * * *',   -- 3 AM UTC daily
  $$
    DELETE FROM public.tasks
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '90 days';

    DELETE FROM public.stems
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '90 days';

    DELETE FROM public.tracks
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '90 days';

    DELETE FROM public.projects
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '90 days';
  $$
);

-- ── 2. Prune audit logs older than 1 year ───────────────────────────────────
SELECT cron.schedule(
  'purge-audit-logs',
  '0 4 * * 0',   -- 4 AM UTC every Sunday
  $$
    DELETE FROM public.audit_logs
    WHERE created_at < now() - interval '1 year';
  $$
);

-- ── 3. Prune read notifications older than 30 days ──────────────────────────
SELECT cron.schedule(
  'purge-notifications',
  '0 4 * * *',   -- 4 AM UTC daily
  $$
    DELETE FROM public.notifications
    WHERE read_at IS NOT NULL
      AND created_at < now() - interval '30 days';
  $$
);

-- ── 4. Prune chat messages older than 6 months ──────────────────────────────
-- Chat history beyond 6 months is rarely referenced and grows quickly.
-- If longer history is needed later this can be raised.
SELECT cron.schedule(
  'purge-chat-messages',
  '0 5 * * *',   -- 5 AM UTC daily
  $$
    DELETE FROM public.chat_messages
    WHERE created_at < now() - interval '6 months';
  $$
);

-- ── 5. Version cap — keep only the last 10 versions per track/stem ──────────
-- Prevents unbounded accumulation of audio file metadata.
-- The actual Storage objects are NOT deleted here (requires service-role API call);
-- orphaned storage_path values are cleaned via a nightly Edge Function job.

CREATE OR REPLACE FUNCTION enforce_track_version_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.track_versions
  WHERE track_id = NEW.track_id
    AND id NOT IN (
      SELECT id FROM public.track_versions
      WHERE track_id = NEW.track_id
      ORDER BY version_number DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_version_cap ON public.track_versions;
CREATE TRIGGER trg_track_version_cap
  AFTER INSERT ON public.track_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_track_version_cap();

CREATE OR REPLACE FUNCTION enforce_stem_version_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.stem_versions
  WHERE stem_id = NEW.stem_id
    AND id NOT IN (
      SELECT id FROM public.stem_versions
      WHERE stem_id = NEW.stem_id
      ORDER BY version_number DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stem_version_cap ON public.stem_versions;
CREATE TRIGGER trg_stem_version_cap
  AFTER INSERT ON public.stem_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_stem_version_cap();
