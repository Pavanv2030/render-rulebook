
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  sender text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_support_messages_session ON public.support_messages(session_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
