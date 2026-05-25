
-- Deny-all policies on tables flagged by scanner. Edge functions use service role and bypass RLS.
CREATE POLICY "no_public_access" ON public.account_inventory FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.conversation_states FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.crypto_wallets FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.customers FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.login_requests FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.orders FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.referrals FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.stock_alerts FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.support_messages FOR ALL TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.upi_wallets FOR ALL TO public USING (false) WITH CHECK (false);

-- country_pricing: pricing is public (shown on landing page) — allow anonymous SELECT only.
CREATE POLICY "public_read_pricing" ON public.country_pricing FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "no_public_write_pricing" ON public.country_pricing FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "no_public_update_pricing" ON public.country_pricing FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY "no_public_delete_pricing" ON public.country_pricing FOR DELETE TO public USING (false);

-- Public RPC to expose ONLY aggregated stock counts (no file paths).
CREATE OR REPLACE FUNCTION public.get_public_stock()
RETURNS TABLE (country text, account_type text, available bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT country, account_type, count(*)::bigint AS available
  FROM public.account_inventory
  WHERE status = 'available'
  GROUP BY country, account_type;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_stock() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_stock() TO anon, authenticated;

-- Revoke broad EXECUTE on SECURITY DEFINER helpers — only edge functions (service role) need them.
REVOKE EXECUTE ON FUNCTION public.adjust_wallet_balance(text, text, numeric, text, text, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_customer_code() FROM public, anon, authenticated;

-- Storage: explicitly deny public access to the private account-files bucket.
CREATE POLICY "account_files_no_public_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id <> 'account-files');
CREATE POLICY "account_files_no_public_write" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id <> 'account-files');
CREATE POLICY "account_files_no_public_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id <> 'account-files') WITH CHECK (bucket_id <> 'account-files');
CREATE POLICY "account_files_no_public_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id <> 'account-files');
