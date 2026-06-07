CREATE TABLE public.razorpay_payments (
  razorpay_order_id text PRIMARY KEY,
  razorpay_payment_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  purpose text NOT NULL,
  reference_id text,
  telegram_id text NOT NULL,
  chat_id text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT ALL ON public.razorpay_payments TO service_role;
ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_public_access" ON public.razorpay_payments FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX idx_razorpay_payments_telegram ON public.razorpay_payments(telegram_id, status);