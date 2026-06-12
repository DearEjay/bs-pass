-- Add full_name, pro_name, ipi_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pro_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ipi_number text;

-- Backfill full_name from display_name for all existing profiles
UPDATE public.profiles
SET full_name = display_name
WHERE full_name IS NULL AND display_name IS NOT NULL;
