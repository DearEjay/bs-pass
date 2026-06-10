-- Fix 1: pending_invites has no updated_at column but had a trigger that tried to set it.
-- Drop the broken trigger.
DROP TRIGGER IF EXISTS set_pending_invites_updated_at ON public.pending_invites;

-- Fix 2: invited_by had no ON DELETE CASCADE, so deleting an inviter failed.
-- Re-create the FK with CASCADE so deleting a user cascades their sent invites.
ALTER TABLE public.pending_invites
  DROP CONSTRAINT IF EXISTS pending_invites_invited_by_fkey;

ALTER TABLE public.pending_invites
  ADD CONSTRAINT pending_invites_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix 3: Make the invite-upgrade trigger non-fatal so a trigger bug can never
-- block user creation. Wrap everything in EXCEPTION WHEN OTHERS THEN RETURN NEW.
CREATE OR REPLACE FUNCTION public.handle_new_user_invite_upgrade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  invite RECORD;
  user_email TEXT;
BEGIN
  BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.id;

    IF user_email IS NULL THEN
      RETURN NEW;
    END IF;

    FOR invite IN
      SELECT *
      FROM public.pending_invites
      WHERE lower(email) = lower(user_email)
        AND accepted_at IS NULL
        AND expires_at > now()
    LOOP
      INSERT INTO public.collaborators (project_id, user_id, roles, status, is_main_artist)
      VALUES (invite.project_id, NEW.id, invite.roles, 'active', false)
      ON CONFLICT (project_id, user_id) DO UPDATE
        SET roles = EXCLUDED.roles,
            status = 'active',
            accepted_at = now();

      UPDATE public.pending_invites
      SET accepted_at = now()
      WHERE id = invite.id;
    END LOOP;

  EXCEPTION WHEN OTHERS THEN
    -- Never block user creation due to invite-upgrade errors
    NULL;
  END;

  RETURN NEW;
END;
$$;
