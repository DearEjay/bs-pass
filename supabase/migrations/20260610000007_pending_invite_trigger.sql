-- ─────────────────────────────────────────────────────────────────────────────
-- When a new profile is created (user signs up), check for pending invites
-- matching their email and auto-create collaborator rows for them.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_upgrade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  invite RECORD;
  user_email TEXT;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  IF user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- For each pending (unaccepted, unexpired) invite matching this email
  FOR invite IN
    SELECT *
    FROM public.pending_invites
    WHERE lower(email) = lower(user_email)
      AND accepted_at IS NULL
      AND expires_at > now()
  LOOP
    -- Create collaborator row
    INSERT INTO public.collaborators (project_id, user_id, roles, status, is_main_artist)
    VALUES (invite.project_id, NEW.id, invite.roles, 'active', false)
    ON CONFLICT (project_id, user_id) DO UPDATE
      SET roles = EXCLUDED.roles,
          status = 'active',
          accepted_at = now();

    -- Mark pending invite as accepted
    UPDATE public.pending_invites
    SET accepted_at = now()
    WHERE id = invite.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Fire after a new profile row is inserted (profiles are created on signup via existing trigger)
CREATE TRIGGER on_new_profile_check_invites
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_invite_upgrade();
