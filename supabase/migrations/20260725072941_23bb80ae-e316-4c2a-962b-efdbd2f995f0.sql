CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read app_settings" ON public.app_settings;
CREATE POLICY "public read app_settings" ON public.app_settings FOR SELECT USING (true);
INSERT INTO public.app_settings (key, value) VALUES ('maintenance', '{"enabled": false}'::jsonb) ON CONFLICT (key) DO NOTHING;