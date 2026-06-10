-- Replace the 8-value status enum with 6 values
-- Old: draft | recording | recorded | mixing | mixed | mastering | mastered | released
-- New: not_started | writing | recording | mixing | mastering | released

-- 1. Drop old constraint
ALTER TABLE public.tracks DROP CONSTRAINT tracks_current_status_check;

-- 2. Migrate existing rows
UPDATE public.tracks SET current_status = 'not_started' WHERE current_status = 'draft';
UPDATE public.tracks SET current_status = 'recording'   WHERE current_status = 'recorded';
UPDATE public.tracks SET current_status = 'mixing'      WHERE current_status = 'mixed';
UPDATE public.tracks SET current_status = 'mastering'   WHERE current_status = 'mastered';

-- 3. New default
ALTER TABLE public.tracks ALTER COLUMN current_status SET DEFAULT 'not_started';

-- 4. New constraint
ALTER TABLE public.tracks
  ADD CONSTRAINT tracks_current_status_check
  CHECK (current_status = ANY (ARRAY[
    'not_started'::text,
    'writing'::text,
    'recording'::text,
    'mixing'::text,
    'mastering'::text,
    'released'::text
  ]));
