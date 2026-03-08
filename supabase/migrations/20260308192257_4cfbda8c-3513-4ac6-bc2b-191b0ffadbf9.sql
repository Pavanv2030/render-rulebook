CREATE TABLE public.upi_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upi_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  qr_image_path TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);