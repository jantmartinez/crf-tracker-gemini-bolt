/*
  # Allow public read access to price update logs

  1. Changes
    - Add public read policy to `price_update_log` table to allow viewing logs without authentication
    
  2. Security
    - Read-only access for public users
    - No write permissions granted
*/

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view price update logs" ON price_update_log;

-- Create new public read policy
CREATE POLICY "Allow public read access to price update logs"
  ON price_update_log
  FOR SELECT
  TO public
  USING (true);