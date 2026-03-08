CREATE TABLE public.account_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL DEFAULT 'regular',
  file_path text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  order_id text NULL,
  allocated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(file_path)
);

ALTER TABLE public.account_inventory ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_inventory_available ON public.account_inventory(account_type, status) WHERE status = 'available';