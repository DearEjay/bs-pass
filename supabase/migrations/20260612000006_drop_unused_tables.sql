-- Drop collaborator_role_definitions — lookup table seeded at init but never
-- queried by any application code or Edge Function. Roles are stored as
-- text[] in collaborators.roles and validated by application logic.
-- No foreign key references exist; safe to drop.

DROP TABLE IF EXISTS public.collaborator_role_definitions;
