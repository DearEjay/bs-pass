-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('covers',  'covers',  true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('tracks',  'tracks',  false, 524288000, ARRAY['audio/mpeg','audio/wav','audio/flac','audio/aac','audio/ogg','audio/x-wav']),
  ('stems',   'stems',   false, 524288000, ARRAY['audio/mpeg','audio/wav','audio/flac','audio/aac','audio/ogg','audio/x-wav'])
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- STORAGE RLS POLICIES
-- ─────────────────────────────────────────────

-- Covers: public read, authenticated upload
CREATE POLICY "Anyone can view covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can upload covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers');

CREATE POLICY "Authenticated users can update covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers');

CREATE POLICY "Authenticated users can delete covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'covers');

-- Tracks: authenticated only
CREATE POLICY "Authenticated users can view tracks"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can upload tracks"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can update tracks"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tracks');

CREATE POLICY "Authenticated users can delete tracks"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tracks');

-- Stems: authenticated only
CREATE POLICY "Authenticated users can view stems"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stems');

CREATE POLICY "Authenticated users can upload stems"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stems');

CREATE POLICY "Authenticated users can update stems"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stems');

CREATE POLICY "Authenticated users can delete stems"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stems');

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborators;
