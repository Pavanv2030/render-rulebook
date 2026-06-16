
-- Fix 1: Replace fragile inequality-based permissive deny policies on storage.objects
-- with explicit RESTRICTIVE deny policies scoped to the account-files bucket.
DROP POLICY IF EXISTS "account_files_no_public_select" ON storage.objects;
DROP POLICY IF EXISTS "account_files_no_public_write" ON storage.objects;
DROP POLICY IF EXISTS "account_files_no_public_update" ON storage.objects;
DROP POLICY IF EXISTS "account_files_no_public_delete" ON storage.objects;

CREATE POLICY "account_files_deny_public_select"
ON storage.objects AS RESTRICTIVE FOR SELECT
TO anon, authenticated
USING (bucket_id <> 'account-files');

CREATE POLICY "account_files_deny_public_insert"
ON storage.objects AS RESTRICTIVE FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id <> 'account-files');

CREATE POLICY "account_files_deny_public_update"
ON storage.objects AS RESTRICTIVE FOR UPDATE
TO anon, authenticated
USING (bucket_id <> 'account-files')
WITH CHECK (bucket_id <> 'account-files');

CREATE POLICY "account_files_deny_public_delete"
ON storage.objects AS RESTRICTIVE FOR DELETE
TO anon, authenticated
USING (bucket_id <> 'account-files');

-- Fix 2: The app does not use Realtime subscriptions for support_messages
-- (the chat widget polls). Remove it from the realtime publication so no
-- authenticated client can subscribe to its change stream.
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages;
