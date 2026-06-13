
INSERT INTO public.customer_wallets (telegram_id) VALUES ('7260976578')
ON CONFLICT (telegram_id) DO NOTHING;

UPDATE public.customer_wallets
   SET balance_inr  = balance_inr  + 200,
       total_earned = total_earned + 200,
       updated_at   = now()
 WHERE telegram_id = '7260976578';

UPDATE public.wallet_transactions
   SET telegram_id = '7260976578'
 WHERE telegram_id = 'https://t.me/Riox231';

DELETE FROM public.customer_wallets WHERE telegram_id = 'https://t.me/Riox231';
