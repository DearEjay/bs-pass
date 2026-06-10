-- Lets edge functions look up a user ID by email without calling auth.admin.listUsers()
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email);
  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

-- Batch lookup: given an array of user IDs, return id+email pairs
CREATE OR REPLACE FUNCTION public.get_emails_by_user_ids(p_user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT u.id, u.email::TEXT
    FROM auth.users u
    WHERE u.id = ANY(p_user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_emails_by_user_ids(UUID[]) TO service_role;
