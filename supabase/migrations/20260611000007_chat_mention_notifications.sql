-- Trigger: create a notification for every @mentioned collaborator when a chat message is inserted.
-- Runs SECURITY DEFINER so it can bypass RLS (no INSERT policy exists for authenticated users).
-- Handles all three mention formats produced by the frontend:
--   @[Full Name]   – agent bracket format
--   @Name<ZWNJ>    – ChatInput dropdown (supports multi-word names; chr(8204) = U+200C ZWNJ)
--   @word          – manually typed single-word mention

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
BEGIN
  -- Skip agent messages and bodies that have no @
  IF NEW.sender_type != 'user' OR position('@' IN NEW.body) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR mention_name IN
    WITH raw AS (
      -- @[Bracket Name] – used by the AI agent
      SELECT (regexp_matches(NEW.body, '@\[([^\]]+)\]', 'g'))[1] AS name
      UNION ALL
      -- @Name<ZWNJ> – inserted by ChatInput dropdown (chr(8204) = ZWNJ U+200C)
      SELECT trim(both from (regexp_matches(
        NEW.body,
        '@([^@' || chr(8204) || '\n]+)' || chr(8204),
        'g'
      ))[1])
      UNION ALL
      -- @word – manually typed single-word mention
      SELECT (regexp_matches(NEW.body, '@([A-Za-z0-9_]+)', 'g'))[1]
    )
    SELECT DISTINCT name FROM raw WHERE name IS NOT NULL AND trim(name) <> ''
  LOOP
    -- Match mention to a collaborator on this project (case-insensitive display_name)
    SELECT p.id INTO mentioned_uid
    FROM profiles p
    JOIN collaborators c ON c.user_id = p.id
    WHERE c.project_id = NEW.project_id
      AND c.removed_at IS NULL
      AND lower(p.display_name) = lower(mention_name)
      AND p.id != NEW.sender_id
    LIMIT 1;

    -- Insert exactly one notification per mentioned user per message
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

CREATE TRIGGER chat_mention_notifications
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_mentions();
