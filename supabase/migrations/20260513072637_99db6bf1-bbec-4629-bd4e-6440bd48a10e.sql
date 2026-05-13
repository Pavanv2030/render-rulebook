
-- 1. Extend customer_wallets with USDT balance
ALTER TABLE public.customer_wallets
  ADD COLUMN IF NOT EXISTS balance_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned_usdt numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn_usdt numeric NOT NULL DEFAULT 0;

-- 2. Extend sell_settings with min top-up
ALTER TABLE public.sell_settings
  ADD COLUMN IF NOT EXISTS min_topup_inr numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS min_topup_usdt numeric NOT NULL DEFAULT 2;

INSERT INTO public.sell_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Wallet top-up requests
CREATE TABLE IF NOT EXISTS public.wallet_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  username text,
  amount numeric NOT NULL,
  currency text NOT NULL CHECK (currency IN ('INR','USDT')),
  payment_method text NOT NULL CHECK (payment_method IN ('upi','crypto')),
  proof_text text,
  proof_image_path text,
  source text NOT NULL DEFAULT 'bot' CHECK (source IN ('bot','web')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access" ON public.wallet_topup_requests FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_topup_status ON public.wallet_topup_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_user ON public.wallet_topup_requests(telegram_id, created_at DESC);

-- 4. Wallet transactions ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL,
  currency text NOT NULL CHECK (currency IN ('INR','USDT')),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('topup','admin_credit','admin_debit','order_payment','refund')),
  reference_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access" ON public.wallet_transactions FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_wtx_user ON public.wallet_transactions(telegram_id, created_at DESC);

-- 5. Helper function: atomically adjust wallet + log
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  _telegram_id text,
  _currency text,
  _delta numeric,
  _type text,
  _reference_id text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_inr numeric;
  new_usdt numeric;
BEGIN
  -- Ensure wallet exists
  INSERT INTO public.customer_wallets (telegram_id) VALUES (_telegram_id)
  ON CONFLICT (telegram_id) DO NOTHING;

  IF _currency = 'INR' THEN
    UPDATE public.customer_wallets
       SET balance_inr = balance_inr + _delta,
           total_earned = total_earned + GREATEST(_delta, 0),
           total_withdrawn = total_withdrawn + GREATEST(-_delta, 0),
           updated_at = now()
     WHERE telegram_id = _telegram_id
     RETURNING balance_inr INTO new_inr;
    IF new_inr < 0 THEN
      RAISE EXCEPTION 'Insufficient INR balance';
    END IF;
  ELSIF _currency = 'USDT' THEN
    UPDATE public.customer_wallets
       SET balance_usdt = balance_usdt + _delta,
           total_earned_usdt = total_earned_usdt + GREATEST(_delta, 0),
           total_withdrawn_usdt = total_withdrawn_usdt + GREATEST(-_delta, 0),
           updated_at = now()
     WHERE telegram_id = _telegram_id
     RETURNING balance_usdt INTO new_usdt;
    IF new_usdt < 0 THEN
      RAISE EXCEPTION 'Insufficient USDT balance';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid currency: %', _currency;
  END IF;

  INSERT INTO public.wallet_transactions (telegram_id, currency, amount, type, reference_id, note)
  VALUES (_telegram_id, _currency, _delta, _type, _reference_id, _note);

  RETURN jsonb_build_object(
    'telegram_id', _telegram_id,
    'currency', _currency,
    'new_balance', COALESCE(new_inr, new_usdt)
  );
END;
$$;

-- Add unique constraint on customer_wallets.telegram_id if missing
CREATE UNIQUE INDEX IF NOT EXISTS customer_wallets_telegram_id_key ON public.customer_wallets(telegram_id);
