-- Remove overly permissive policies and replace with service-role-only access
-- Since these tables are only accessed via edge functions with service_role key,
-- we restrict anonymous/authenticated access and only allow service_role

DROP POLICY "Service role full access on orders" ON public.orders;
DROP POLICY "Service role full access on customers" ON public.customers;
DROP POLICY "Service role full access on referrals" ON public.referrals;
DROP POLICY "Service role full access on conversation_states" ON public.conversation_states;

-- No public policies needed - edge functions use service_role which bypasses RLS