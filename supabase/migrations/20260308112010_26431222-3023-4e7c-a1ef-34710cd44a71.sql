ALTER TABLE public.account_inventory ADD COLUMN country text NOT NULL DEFAULT 'IN';

DROP INDEX IF EXISTS idx_inventory_available;
CREATE INDEX idx_inventory_available ON public.account_inventory(account_type, country, status) WHERE status = 'available';