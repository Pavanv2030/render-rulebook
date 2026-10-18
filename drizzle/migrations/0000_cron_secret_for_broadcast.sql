CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_secrets TO service_role;
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_secrets (name, value)
VALUES ('cron_broadcast', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.unschedule('daily-stock-broadcast-9am-ist');
SELECT cron.schedule('daily-stock-broadcast-9am-ist', '30 3 * * *', $$
  SELECT net.http_post(
    url:='https://ptjqnvbebnpzaxdhxbtr.supabase.co/functions/v1/daily-stock-broadcast',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT value FROM public.internal_secrets WHERE name='cron_broadcast')),
    body:=jsonb_build_object('triggered_at', now())
  );
$$);