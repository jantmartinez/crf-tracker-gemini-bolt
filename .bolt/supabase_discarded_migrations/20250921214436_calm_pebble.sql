/*
  # Add Commission Settings to Accounts Table

  1. New Columns
    - `open_close_commission` (numeric) - Commission rate for opening/closing positions (default 0.25%)
    - `night_commission` (numeric) - Overnight holding commission rate (default 7%)

  2. Features
    - Default values set for existing and new accounts
    - Proper constraints to ensure valid percentage ranges (0-100%)
    - Backward compatibility with existing accounts

  3. Data Validation
    - Commission rates must be between 0 and 100 (representing percentages)
    - Non-null constraints with sensible defaults
*/

-- Add commission settings columns to accounts table
DO $$
BEGIN
  -- Add open_close_commission column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'open_close_commission'
  ) THEN
    ALTER TABLE accounts ADD COLUMN open_close_commission numeric(5,4) DEFAULT 0.25 NOT NULL;
  END IF;

  -- Add night_commission column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'night_commission'
  ) THEN
    ALTER TABLE accounts ADD COLUMN night_commission numeric(5,4) DEFAULT 7.0 NOT NULL;
  END IF;
END $$;

-- Add constraints to ensure valid commission ranges (0-100%)
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

-- Update existing accounts with default values if they have NULL values
UPDATE accounts 
SET 
  open_close_commission = 0.25,
  night_commission = 7.0
WHERE 
  open_close_commission IS NULL 
  OR night_commission IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN accounts.open_close_commission IS 'Commission rate (%) charged for opening and closing positions';
COMMENT ON COLUMN accounts.night_commission IS 'Commission rate (%) charged per day for overnight positions';