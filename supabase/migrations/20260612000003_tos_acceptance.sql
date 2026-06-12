-- Track Terms of Service acceptance per user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version      text;        -- e.g. '2026-06-12'

-- Index for compliance queries (who has/hasn't accepted)
CREATE INDEX IF NOT EXISTS profiles_tos_accepted_at_idx ON profiles (tos_accepted_at)
  WHERE tos_accepted_at IS NULL;

-- Allow users to update their own tos fields (RLS already allows self-update)
COMMENT ON COLUMN profiles.tos_accepted_at IS 'Timestamp when the user accepted the current ToS/Privacy Policy';
COMMENT ON COLUMN profiles.tos_version     IS 'Version string of the ToS that was accepted (date-stamped)';
