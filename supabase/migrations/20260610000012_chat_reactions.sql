-- Chat reactions (iMessage-style tapbacks)

CREATE TABLE public.chat_reactions (
  id          uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id  uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chat_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_reactions_unique UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_chat_reactions_message ON public.chat_reactions (message_id);

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- Any collaborator on the project may read reactions
CREATE POLICY "Collaborators can view reactions"
  ON public.chat_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.collaborators c ON c.project_id = cm.project_id
      WHERE cm.id = message_id
        AND c.user_id = auth.uid()
        AND c.removed_at IS NULL
    )
  );

-- Users can add reactions (only their own)
CREATE POLICY "Users can add reactions"
  ON public.chat_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own reactions
CREATE POLICY "Users can remove reactions"
  ON public.chat_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());
