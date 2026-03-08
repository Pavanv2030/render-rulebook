CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  country text NOT NULL,
  account_type text NOT NULL DEFAULT 'regular',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified boolean NOT NULL DEFAULT false,
  UNIQUE(chat_id, country, account_type)
);