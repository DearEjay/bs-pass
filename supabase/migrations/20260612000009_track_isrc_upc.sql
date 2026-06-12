ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS isrc text;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS upc text;
