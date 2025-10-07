/*
  # Rename last_price to latest_price in symbols table

  1. Changes
    - Rename column `last_price` to `latest_price` in `symbols` table for clarity
    - This field stores the most recent known price of a stock/symbol
    - Used for calculating unrealized P&L on open positions

  2. Notes
    - No data loss, only a column rename
    - Existing data preserved
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'symbols' AND column_name = 'last_price'
  ) THEN
    ALTER TABLE symbols RENAME COLUMN last_price TO latest_price;
  END IF;
END $$;