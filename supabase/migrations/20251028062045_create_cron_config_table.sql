/*
  # Create configuration table for cron jobs

  1. New Tables
    - `cron_config`
      - `key` (text, primary key) - Configuration key name
      - `value` (text) - Configuration value
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Create config table to store Supabase URL and keys
    - Update trigger_price_update() function to read from config table
    - Insert default configuration values

  3. Security
    - RLS enabled but only system can access
    - Used by cron jobs to get necessary credentials
*/

-- Create config table
CREATE TABLE IF NOT EXISTS cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS but allow postgres to access
ALTER TABLE cron_config ENABLE ROW LEVEL SECURITY;

-- No public policies - only system/postgres can access
CREATE POLICY "Only postgres can access cron_config"
  ON cron_config
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Insert configuration values
INSERT INTO cron_config (key, value)
VALUES 
  ('supabase_url', 'https://iujqeylscjivxmxytjde.supabase.co'),
  ('anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1anFleWxzY2ppdnhteHl0amRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDI1NjUsImV4cCI6MjA3NTA3ODU2NX0.xiCRTxUbF5KQROa7cOlFaISGL4HpPoEXjghWg_I0c5U')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Drop and recreate the trigger function
DROP FUNCTION IF EXISTS trigger_price_update();

CREATE OR REPLACE FUNCTION trigger_price_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  anon_key text;
  function_url text;
BEGIN
  -- Retrieve configuration from config table
  SELECT value INTO supabase_url
  FROM cron_config
  WHERE key = 'supabase_url';
  
  SELECT value INTO anon_key
  FROM cron_config
  WHERE key = 'anon_key';
  
  -- Check if configuration is available
  IF supabase_url IS NULL OR anon_key IS NULL THEN
    RAISE NOTICE 'Configuration not found. Please check cron_config table.';
    RETURN;
  END IF;
  
  -- Construct the Edge Function URL
  function_url := supabase_url || '/functions/v1/update-stock-prices';
  
  RAISE NOTICE 'Triggering price update to: %', function_url;
  
  -- Make async HTTP POST request using pg_net
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  ) INTO request_id;
  
  RAISE NOTICE 'Price update triggered via cron, request_id: %', request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in trigger_price_update: % %', SQLERRM, SQLSTATE;
END;
$$;
