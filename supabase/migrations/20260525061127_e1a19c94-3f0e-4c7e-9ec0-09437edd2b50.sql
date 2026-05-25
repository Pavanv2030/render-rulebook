CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('auto-delete-old-delivered-orders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-delete-old-delivered-orders');

SELECT cron.schedule(
  'auto-delete-old-delivered-orders',
  '0 3 * * *',
  $$DELETE FROM public.orders WHERE status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at < now() - interval '7 days'$$
);