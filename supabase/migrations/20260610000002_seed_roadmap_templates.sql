-- Seed roadmap templates for all 4 project types.
-- Tasks array is JSONB consumed by agent-generate-roadmap as a starting point for Gemini.
-- offset_days = days from timeline_start to suggested due date.

INSERT INTO public.roadmap_templates (project_type, title, tasks) VALUES

-- ─────────────────────────────────────────────────────────────
-- SINGLE
-- ─────────────────────────────────────────────────────────────
('single', 'Standard Single Release', '[
  {"title":"Finalize recording session","priority":"high","offset_days":7,"plugin":"ar","description":"Confirm the master take is locked and no further tracking is needed."},
  {"title":"Book mixing engineer","priority":"high","offset_days":5,"plugin":"ar","description":"Shortlist and confirm a mixing engineer; share stems and reference tracks."},
  {"title":"Mixing","priority":"high","offset_days":21,"plugin":"project_management","description":"Deliver fully mixed, revision-approved stereo file."},
  {"title":"Mastering","priority":"high","offset_days":28,"plugin":"project_management","description":"Deliver mastered audio at streaming-ready loudness (-14 LUFS)."},
  {"title":"Cover art design","priority":"medium","offset_days":14,"plugin":"creative","description":"Commission or create final 3000×3000 px cover art."},
  {"title":"Write artist bio & press release","priority":"medium","offset_days":21,"plugin":"creative","description":"Draft 150-word bio and one-page press release for DSPs and blogs."},
  {"title":"Set up distribution","priority":"high","offset_days":25,"plugin":"project_management","description":"Submit single to distributor (DistroKid/TuneCore) with all metadata."},
  {"title":"Plan release rollout","priority":"medium","offset_days":25,"plugin":"marketing","description":"Schedule social posts, email blast, and release-day content."},
  {"title":"Pitch to editorial playlists","priority":"low","offset_days":14,"plugin":"opportunities","description":"Submit to Spotify for Artists editorial at least 7 days before release."}
]'),

-- ─────────────────────────────────────────────────────────────
-- EP
-- ─────────────────────────────────────────────────────────────
('ep', 'Standard EP Release', '[
  {"title":"Finalise all recording sessions","priority":"high","offset_days":10,"plugin":"ar","description":"Lock all takes for every track on the EP."},
  {"title":"A&R review — track selection & sequencing","priority":"high","offset_days":12,"plugin":"ar","description":"Confirm final tracklist, running order, and any cuts."},
  {"title":"Book mixing engineer","priority":"high","offset_days":7,"plugin":"ar","description":"Confirm mixer; share stems and reference tracks for all songs."},
  {"title":"Mixing — all tracks","priority":"high","offset_days":28,"plugin":"project_management","description":"Deliver mix revisions and approvals for every track."},
  {"title":"Mastering","priority":"high","offset_days":35,"plugin":"project_management","description":"Deliver mastered album sequence at -14 LUFS."},
  {"title":"Cover art design","priority":"medium","offset_days":21,"plugin":"creative","description":"Deliver 3000×3000 px cover art and any variant assets."},
  {"title":"EP bio & press release","priority":"medium","offset_days":28,"plugin":"creative","description":"Write project bio, track-by-track notes, and press release."},
  {"title":"Set up distribution","priority":"high","offset_days":35,"plugin":"project_management","description":"Submit EP with full metadata and ISRC codes to distributor."},
  {"title":"Pre-save campaign","priority":"medium","offset_days":30,"plugin":"marketing","description":"Set up pre-save link (feature.fm or similar) and begin promotion."},
  {"title":"Playlist pitching","priority":"low","offset_days":21,"plugin":"opportunities","description":"Submit lead single to Spotify editorial and independent playlist curators."},
  {"title":"Release rollout plan","priority":"medium","offset_days":32,"plugin":"marketing","description":"Map out social content, interview bookings, and release-week posts."}
]'),

-- ─────────────────────────────────────────────────────────────
-- ALBUM
-- ─────────────────────────────────────────────────────────────
('album', 'Standard Album Release', '[
  {"title":"Song selection & sequencing","priority":"high","offset_days":14,"plugin":"ar","description":"Lock final tracklist and running order with A&R feedback."},
  {"title":"Finalise all recording sessions","priority":"high","offset_days":21,"plugin":"ar","description":"Confirm all tracking is complete; no further overdubs."},
  {"title":"Book mixing engineer","priority":"high","offset_days":10,"plugin":"ar","description":"Engage mixer; deliver stems, budgets, and timeline."},
  {"title":"Mixing — all tracks","priority":"high","offset_days":45,"plugin":"project_management","description":"Complete mix revisions and approvals for all songs."},
  {"title":"Mastering","priority":"high","offset_days":56,"plugin":"project_management","description":"Deliver DDP/WAV master at streaming-ready loudness."},
  {"title":"Cover art & visual identity","priority":"high","offset_days":28,"plugin":"creative","description":"Deliver album cover, spine, back-cover, and digital assets."},
  {"title":"Merch planning","priority":"medium","offset_days":35,"plugin":"marketing","description":"Design and order at least one physical merch item tied to the album."},
  {"title":"Album bio & press materials","priority":"medium","offset_days":42,"plugin":"creative","description":"Write press release, album bio, and track-by-track liner notes."},
  {"title":"Set up distribution","priority":"high","offset_days":56,"plugin":"project_management","description":"Submit to distributor with complete metadata, ISRC, and UPC."},
  {"title":"Pre-save campaign","priority":"high","offset_days":45,"plugin":"marketing","description":"Launch pre-save link at least 4 weeks before release."},
  {"title":"Lead single strategy","priority":"high","offset_days":21,"plugin":"marketing","description":"Choose and release a lead single 4+ weeks ahead of album drop."},
  {"title":"Playlist & press pitching","priority":"medium","offset_days":35,"plugin":"opportunities","description":"Submit to editorial, blogs, tastemaker playlists, and radio."}
]'),

-- ─────────────────────────────────────────────────────────────
-- MIXTAPE
-- ─────────────────────────────────────────────────────────────
('mixtape', 'Standard Mixtape Release', '[
  {"title":"Finalise recording sessions","priority":"high","offset_days":14,"plugin":"ar","description":"Lock all takes; no further tracking after this point."},
  {"title":"Mix & master","priority":"high","offset_days":28,"plugin":"project_management","description":"Deliver mixed and mastered files — can be self-mixed to keep costs low."},
  {"title":"Cover art design","priority":"medium","offset_days":14,"plugin":"creative","description":"Create high-impact 3000×3000 px cover art."},
  {"title":"Set up free distribution","priority":"medium","offset_days":28,"plugin":"project_management","description":"Upload to DatPiff, SoundCloud, or a free DSP tier — no paid distro required."},
  {"title":"Build hype on socials","priority":"medium","offset_days":21,"plugin":"marketing","description":"Post snippets, countdowns, and feature announcements leading up to drop."},
  {"title":"Release-day rollout","priority":"medium","offset_days":30,"plugin":"marketing","description":"Coordinate same-day posts, YouTube upload, and link-in-bio update."},
  {"title":"Pitch to mixtape blogs & curators","priority":"low","offset_days":14,"plugin":"opportunities","description":"Submit to HotNewHipHop, 2DopeBoyz, and genre-specific curators."}
]')

ON CONFLICT DO NOTHING;
