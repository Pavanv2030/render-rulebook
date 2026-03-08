INSERT INTO storage.buckets (id, name, public) VALUES ('bot-assets', 'bot-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on bot-assets" ON storage.objects FOR SELECT USING (bucket_id = 'bot-assets');
