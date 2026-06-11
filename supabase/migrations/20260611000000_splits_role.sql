-- Add a per-row role annotation to splits so the main artist can record
-- which of the collaborator's assigned roles this split line represents.
ALTER TABLE public.splits ADD COLUMN role text;
