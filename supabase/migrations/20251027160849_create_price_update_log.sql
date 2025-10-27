/*
  # Create price update logging table

  1. New Tables
    - `price_update_log`
      - `id` (uuid, primary key) - Unique identifier for each update log entry
      - `symbol_id` (uuid, foreign key) - Reference to the symbol being updated
      - `old_price` (numeric) - Previous price before update
      - `new_price` (numeric) - New price after update
      - `source` (text) - Source of the price update (e.g., 'finnhub_api', 'manual')
      - `triggered_by` (text) - How the update was triggered ('cron', 'manual', 'api')
      - `status` (text) - Status of the update ('success', 'failed')
      - `error_message` (text) - Error message if update failed
      - `created_at` (timestamptz) - Timestamp of the update

  2. Security
    - Enable RLS on `price_update_log` table
    - Add policy for authenticated users to read logs
    - Service role required for inserting logs (via Edge Function)
*/

CREATE TABLE IF NOT EXISTS price_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id uuid NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  source text NOT NULL DEFAULT 'finnhub_api',
  triggered_by text NOT NULL CHECK (triggered_by IN ('cron', 'manual', 'api')),
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view price update logs"
  ON price_update_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_price_update_log_symbol_id ON price_update_log(symbol_id);
CREATE INDEX IF NOT EXISTS idx_price_update_log_created_at ON price_update_log(created_at DESC);