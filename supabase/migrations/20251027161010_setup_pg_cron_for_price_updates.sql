/*
  # Set up pg_cron for automated daily price updates

  1. Extensions
    - Enable pg_cron extension if not already enabled
    - Enable pg_net extension for HTTP requests

  2. Functions
    - Create function to call the Edge Function for price updates
    - Schedule daily execution at midnight CET (11 PM UTC in winter, 10 PM UTC in summer)
    
  3. Notes
    - CET is UTC+1 (winter) and CEST is UTC+2 (summer)
    - Using 23:00 UTC to approximate midnight CET/CEST
    - The cron job will trigger the Edge Function which handles all the price updates
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_price_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Schedule the job to run daily at 23:00 UTC (approximately midnight CET)
-- This accounts for CET (UTC+1) and CEST (UTC+2) time zones
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('daily-stock-price-update');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Job doesn't exist, continue
END $$;

-- Schedule new job
SELECT cron.schedule(
  'daily-stock-price-update',
  '0 23 * * *', -- At 23:00 UTC every day (midnight CET during winter time)
  'SELECT trigger_price_update();'
);