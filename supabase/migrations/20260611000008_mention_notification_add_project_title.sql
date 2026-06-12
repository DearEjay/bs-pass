-- Update notify_chat_mentions() to include projectTitle in the notification payload.
-- Uses CREATE OR REPLACE so the existing trigger binding is preserved.

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
  project_title  TEXT;
  notified       UUID[] := '{}';
BEGIN
  IF NEW.sender_type != 'user' OR position('@' IN NEW.body) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT title INTO project_title FROM projects WHERE id = NEW.project_id;

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
    SELECT DISTINCT name FROM raw WHERE name IS NOT NULL AND trim(name) <> ''
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
          'senderName',    COALESCE(sender_name, 'Someone'),
          'messageBody',   left(NEW.body, 200),
          'projectTitle',  COALESCE(project_title, 'a project')
        )
      );
      notified := array_append(notified, mentioned_uid);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
