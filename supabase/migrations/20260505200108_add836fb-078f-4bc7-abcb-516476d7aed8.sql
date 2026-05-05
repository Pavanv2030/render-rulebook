
-- Pricing per country + service
CREATE TABLE public.sell_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  flag text NOT NULL DEFAULT '🌍',
  service text NOT NULL DEFAULT 'telegram',
  price_inr numeric NOT NULL DEFAULT 0,
  price_usdt numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code, service)
);
ALTER TABLE public.sell_pricing ENABLE ROW LEVEL SECURITY;

-- Submitted accounts
CREATE TABLE public.account_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_telegram_id text NOT NULL,
  seller_username text,
  country_code text NOT NULL,
  service text NOT NULL DEFAULT 'telegram',
  phone_number text NOT NULL,
  session_string text,
  tdata jsonb,
  price_inr numeric NOT NULL DEFAULT 0,
  price_usdt numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  exported boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz
);
ALTER TABLE public.account_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_submissions_seller ON public.account_submissions(seller_telegram_id);
CREATE INDEX idx_submissions_status ON public.account_submissions(status);
CREATE INDEX idx_submissions_country_service ON public.account_submissions(country_code, service);

-- Wallet balances
CREATE TABLE public.customer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL UNIQUE,
  balance_inr numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  amount_inr numeric NOT NULL,
  method text NOT NULL,
  payout_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Sell flow state
CREATE TABLE public.sell_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'idle',
  country_code text,
  service text DEFAULT 'telegram',
  phone_number text,
  phone_code_hash text,
  mtproto_session text,
  withdrawal_method text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sell_sessions ENABLE ROW LEVEL SECURITY;

-- Settings
CREATE TABLE public.sell_settings (
  id integer PRIMARY KEY DEFAULT 1,
  min_withdrawal_inr numeric NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);
ALTER TABLE public.sell_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.sell_settings (id, min_withdrawal_inr) VALUES (1, 500);
