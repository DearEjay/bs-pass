-- Extend notify_chat_mentions to handle @here.
-- @here notifies ALL active collaborators on the project.
-- If the message is from a user, that user is excluded.
-- Agent @here messages notify everyone.

CREATE OR REPLACE FUNCTION public.notify_chat_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mention_name   TEXT;
  mentioned_uid  UUID;
  sender_name    TEXT;
  notified       UUID[] := '{}';
  collab_uid     UUID;
BEGIN
  IF position('@' IN NEW.body) = 0 THEN
    RETURN NEW;
  END IF;

  -- ── @here: notify every active collaborator except the sender ────────────
  IF NEW.body ~ '@here' THEN
    IF NEW.sender_type = 'user' THEN
      SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
    ELSE
      sender_name := 'Agent';
    END IF;

    FOR collab_uid IN
      SELECT c.user_id
      FROM collaborators c
      WHERE c.project_id = NEW.project_id
        AND c.removed_at IS NULL
        AND (NEW.sender_type != 'user' OR c.user_id != NEW.sender_id)
    LOOP
      IF NOT (collab_uid = ANY(notified)) THEN
        INSERT INTO notifications (user_id, project_id, type, payload)
        VALUES (
          collab_uid,
          NEW.project_id,
          'mention',
          jsonb_build_object(
            'senderName', COALESCE(sender_name, 'Someone'),
            'messageBody', left(NEW.body, 200)
          )
        );
        notified := array_append(notified, collab_uid);
      END IF;
    END LOOP;
  END IF;

  -- ── Named @mentions (user messages only) ─────────────────────────────────
  IF NEW.sender_type != 'user' THEN
    RETURN NEW;
  END IF;

  IF sender_name IS NULL THEN
    SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  END IF;

  FOR mention_name IN
    WITH raw AS (
      SELECT (regexp_matches(NEW.body, '@\[([^\]]+)\]', 'g'))[1] AS name
      UNION ALL
      SELECT trim(both from (regexp_matches(
        NEW.body,
        '@([^@' || chr(8204) || '\n]+)' || chr(8204),
        'g'
      ))[1])
      UNION ALL
      SELECT (regexp_matches(NEW.body, '@([A-Za-z0-9_]+)', 'g'))[1]
    )
    SELECT DISTINCT name FROM raw
    WHERE name IS NOT NULL AND trim(name) <> '' AND lower(name) != 'here'
  LOOP
    SELECT p.id INTO mentioned_uid
    FROM profiles p
    JOIN collaborators c ON c.user_id = p.id
    WHERE c.project_id = NEW.project_id
      AND c.removed_at IS NULL
      AND lower(p.display_name) = lower(mention_name)
      AND p.id != NEW.sender_id
    LIMIT 1;

    IF mentioned_uid IS NOT NULL AND NOT (mentioned_uid = ANY(notified)) THEN
      INSERT INTO notifications (user_id, project_id, type, payload)
      VALUES (
        mentioned_uid,
        NEW.project_id,
        'mention',
        jsonb_build_object(
          'senderName', COALESCE(sender_name, 'Someone'),
          'messageBody', left(NEW.body, 200)
        )
      );
      notified := array_append(notified, mentioned_uid);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
