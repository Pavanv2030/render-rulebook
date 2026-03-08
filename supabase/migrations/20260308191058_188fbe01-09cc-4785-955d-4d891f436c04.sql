ALTER TABLE public.country_pricing ADD COLUMN regular_price_usdt numeric NOT NULL DEFAULT 0;
ALTER TABLE public.country_pricing ADD COLUMN aged_price_usdt numeric NOT NULL DEFAULT 0;