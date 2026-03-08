
CREATE TABLE public.country_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  flag text NOT NULL DEFAULT '🌍',
  regular_price numeric NOT NULL DEFAULT 50,
  aged_price numeric NOT NULL DEFAULT 100,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(country_code)
);

-- Seed initial pricing data
INSERT INTO public.country_pricing (country_code, country_name, flag, regular_price, aged_price) VALUES
  ('IN', 'India', '🇮🇳', 50, 100),
  ('US', 'USA', '🇺🇸', 50, 150),
  ('UK', 'UK', '🇬🇧', 80, 150),
  ('ET', 'Ethiopia', '🇪🇹', 50, 100),
  ('AR', 'Argentina', '🇦🇷', 75, 120),
  ('BR', 'Brazil', '🇧🇷', 200, 400),
  ('DE', 'Germany', '🇩🇪', 200, 400),
  ('FR', 'France', '🇫🇷', 250, 500),
  ('NG', 'Nigeria', '🇳🇬', 50, 100),
  ('KE', 'Kenya', '🇰🇪', 50, 100),
  ('ZA', 'South Africa', '🇿🇦', 50, 100),
  ('AE', 'UAE', '🇦🇪', 300, 600),
  ('SA', 'Saudi Arabia', '🇸🇦', 300, 600),
  ('TR', 'Turkey', '🇹🇷', 200, 400),
  ('CA', 'Canada', '🇨🇦', 50, 100),
  ('AU', 'Australia', '🇦🇺', 200, 400),
  ('JP', 'Japan', '🇯🇵', 200, 400),
  ('RU', 'Russia', '🇷🇺', 200, 400),
  ('TM', 'Turkmenistan', '🇹🇲', 100, 200),
  ('MG', 'Madagascar', '🇲🇬', 50, 100);
