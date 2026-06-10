-- Batch lookup: given an array of user IDs, return id+email pairs for edge functions
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
