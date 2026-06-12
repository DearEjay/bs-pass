ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS upc text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS record_label text;
ALTER TABLE public.tracks DROP COLUMN IF EXISTS upc;
