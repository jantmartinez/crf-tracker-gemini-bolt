/*
  # Fix Security Issues

  1. Remove Unused Indexes
    - Drop indexes that are not being used to improve write performance
    - Keep only necessary indexes (group_id, ticker, created_at)

  2. Fix Function Security
    - Add explicit search_path to trigger_price_update function to prevent search path injection attacks

  ## Security Notes
  - Unused indexes consume storage and slow down writes without providing query benefits
  - Mutable search_path in SECURITY DEFINER functions can lead to privilege escalation
  - pg_net extension cannot be moved from public schema (not supported by the extension)
*/

-- Step 1: Drop unused indexes
DROP INDEX IF EXISTS idx_accounts_is_active;
DROP INDEX IF EXISTS idx_symbols_is_active;
DROP INDEX IF EXISTS idx_operation_groups_account_id;
DROP INDEX IF EXISTS idx_operation_groups_symbol_id;
DROP INDEX IF EXISTS idx_operation_groups_status;
DROP INDEX IF EXISTS idx_operation_fills_side;
DROP INDEX IF EXISTS idx_operation_fills_open_fee;
DROP INDEX IF EXISTS idx_operation_fills_close_fee;
DROP INDEX IF EXISTS idx_operation_fills_night_fee;
DROP INDEX IF EXISTS idx_operation_groups_open_at;
DROP INDEX IF EXISTS idx_price_update_log_symbol_id;

-- Step 2: Fix function with explicit search_path to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.trigger_price_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  supabase_url text;
  anon_key text;
  function_url text;
  request_id bigint;
BEGIN
  -- Get the Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.anon_key', true);

  -- Construct the Edge Function URL
  function_url := supabase_url || '/functions/v1/update-stock-prices';

  -- Make async HTTP POST request using pg_net
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  ) INTO request_id;

  -- Log the request
  RAISE NOTICE 'Price update triggered via cron, request_id: %', request_id;
END;
$$;