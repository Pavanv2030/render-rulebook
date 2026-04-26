-- Function to generate a short unique customer code like CUS-AB12CD
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_check int;
BEGIN
  LOOP
    code := 'CUS-';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT count(*) INTO exists_check FROM public.customers WHERE customer_code = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Add nullable column first
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_code text;

-- Backfill existing rows
UPDATE public.customers
SET customer_code = public.generate_customer_code()
WHERE customer_code IS NULL;

-- Enforce NOT NULL + UNIQUE + default
ALTER TABLE public.customers
  ALTER COLUMN customer_code SET NOT NULL,
  ALTER COLUMN customer_code SET DEFAULT public.generate_customer_code();

CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_code_key
  ON public.customers(customer_code);