
-- Deny-all policies (service role bypasses RLS)
CREATE POLICY "no_public_access" ON public.sell_pricing FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.account_submissions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.customer_wallets FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.withdrawal_requests FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.sell_sessions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "no_public_access" ON public.sell_settings FOR ALL USING (false) WITH CHECK (false);
