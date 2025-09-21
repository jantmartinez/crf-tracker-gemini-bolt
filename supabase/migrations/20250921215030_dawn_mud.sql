/*
  # Add Commission Fields to Accounts Table

  1. New Fields
    - `open_close_commission` (numeric) - Commission rate for opening/closing positions (default: 0.25%)
    - `night_commission` (numeric) - Daily commission rate for overnight positions (default: 7.0%)

  2. Changes
    - Add two new commission fields to accounts table
    - Set appropriate default values
    - Add constraints to ensure valid percentage ranges (0-100)

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add commission fields to accounts table
DO $$
BEGIN
  -- Add open_close_commission field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'open_close_commission'
  ) THEN
    ALTER TABLE accounts ADD COLUMN open_close_commission numeric(5,2) DEFAULT 0.25;
  END IF;

  -- Add night_commission field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'night_commission'
  ) THEN
    ALTER TABLE accounts ADD COLUMN night_commission numeric(5,2) DEFAULT 7.0;
  END IF;
END $$;

-- Add constraints to ensure commission rates are within valid ranges (0-100%)
DO $$
BEGIN
  -- Add constraint for open_close_commission if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accounts_open_close_commission_check'
  ) THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_open_close_commission_check 
    CHECK (open_close_commission >= 0 AND open_close_commission <= 100);
  END IF;

  -- Add constraint for night_commission if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accounts_night_commission_check'
  ) THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_night_commission_check 
    CHECK (night_commission >= 0 AND night_commission <= 100);
  END IF;
END $$;