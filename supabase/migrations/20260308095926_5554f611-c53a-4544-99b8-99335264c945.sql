-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  username TEXT,
  country TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Regular',
  quantity INTEGER NOT NULL,
  currency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on orders"
  ON public.orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  country TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on customers"
  ON public.customers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_telegram_id TEXT NOT NULL,
  referred_telegram_id TEXT NOT NULL,
  order_id TEXT REFERENCES public.orders(order_id),
  commission NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on referrals"
  ON public.referrals FOR ALL
  USING (true)
  WITH CHECK (true);

-- Conversation state table (for bot flow)
CREATE TABLE public.conversation_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'idle',
  selected_country TEXT,
  selected_quantity INTEGER,
  selected_type TEXT DEFAULT 'regular',
  pending_order_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on conversation_states"
  ON public.conversation_states FOR ALL
  USING (true)
  WITH CHECK (true);