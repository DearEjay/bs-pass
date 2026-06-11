-- Grant table-level permissions for chat_reactions to authenticated role.
-- The blanket GRANT in 20260608000005_grants.sql only covered tables that
-- existed at that point; tables created later need their own grant.

GRANT SELECT, INSERT, DELETE ON public.chat_reactions TO authenticated;
