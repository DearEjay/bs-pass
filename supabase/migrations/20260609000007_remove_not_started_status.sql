-- Remove not_started, make writing the default starting status
ALTER TABLE public.tracks DROP CONSTRAINT tracks_current_status_check;

UPDATE public.tracks SET current_status = 'writing' WHERE current_status = 'not_started';

ALTER TABLE public.tracks ALTER COLUMN current_status SET DEFAULT 'writing';

ALTER TABLE public.tracks
  ADD CONSTRAINT tracks_current_status_check
  CHECK (current_status = ANY (ARRAY[
    'writing'::text,
    'recording'::text,
    'mixing'::text,
    'mastering'::text,
    'released'::text
  ]));
