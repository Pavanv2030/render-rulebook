ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_file_path TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;