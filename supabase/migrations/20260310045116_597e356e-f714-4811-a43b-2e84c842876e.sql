CREATE TABLE public.login_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_chat_id text NOT NULL,
  order_id text NOT NULL,
  phone_number text NOT NULL,
  inventory_id uuid,
  status text NOT NULL DEFAULT 'pending',
  otp_code text,
  twofa_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);