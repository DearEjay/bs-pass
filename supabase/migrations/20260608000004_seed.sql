-- ─────────────────────────────────────────────
-- COLLABORATOR ROLE DEFINITIONS
-- ─────────────────────────────────────────────
INSERT INTO public.collaborator_role_definitions (slug, label, sort_order) VALUES
  ('main_artist',          'Main Artist',          1),
  ('featured_artist',      'Featured Artist',       2),
  ('producer',             'Producer',              3),
  ('co_producer',          'Co-Producer',           4),
  ('recording_engineer',   'Recording Engineer',    5),
  ('mixing_engineer',      'Mixing Engineer',       6),
  ('mastering_engineer',   'Mastering Engineer',    7),
  ('songwriter',           'Songwriter',            8),
  ('session_musician',     'Session Musician',      9),
  ('background_vocalist',  'Background Vocalist',  10),
  ('manager',              'Manager',              11),
  ('ar',                   'A&R',                  12),
  ('graphic_designer',     'Graphic Designer',     13),
  ('video_director',       'Video Director',       14),
  ('marketing',            'Marketing',            15)
ON CONFLICT (slug) DO NOTHING;
