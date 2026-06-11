-- Extend user_agent_preferences with plugin toggles and communication style prefs
ALTER TABLE public.user_agent_preferences
  ADD COLUMN IF NOT EXISTS enabled_plugins jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS agent_tone text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS agent_verbosity text DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS auto_task_triggers boolean DEFAULT true;
