/*
  # Add separate fee columns to operation_fills table

  1. New Columns
    - `open_fee` (numeric) - Fee charged when opening the position
    - `close_fee` (numeric) - Fee charged when closing the position  
    - `night_fee` (numeric) - Accumulated night/overnight fees
    - `fee_currency` (text) - Currency for the fees (default USD)

  2. Schema Changes
    - Add new fee columns with appropriate precision
    - Add constraints to ensure non-negative values
    - Add indexes for performance on fee queries
    - Update existing records to have zero fees initially

  3. Data Migration
    - Set default values for existing records
    - Preserve existing `fees` column for backward compatibility during transition
*/

-- Add new fee columns to operation_fills table
ALTER TABLE operation_fills 
ADD COLUMN IF NOT EXISTS open_fee NUMERIC(15,4) DEFAULT 0 CHECK (open_fee >= 0),
ADD COLUMN IF NOT EXISTS close_fee NUMERIC(15,4) DEFAULT 0 CHECK (close_fee >= 0),
ADD COLUMN IF NOT EXISTS night_fee NUMERIC(15,4) DEFAULT 0 CHECK (night_fee >= 0),
ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'USD';

-- Add indexes for performance on fee queries
CREATE INDEX IF NOT EXISTS idx_operation_fills_open_fee ON operation_fills(open_fee);
CREATE INDEX IF NOT EXISTS idx_operation_fills_close_fee ON operation_fills(close_fee);
CREATE INDEX IF NOT EXISTS idx_operation_fills_night_fee ON operation_fills(night_fee);

-- Update existing records to migrate from generic 'fees' to specific fee types
-- For existing records, assume all fees are opening fees
UPDATE operation_fills 
SET open_fee = COALESCE(fees, 0),
    close_fee = 0,
    night_fee = 0
WHERE open_fee = 0 AND close_fee = 0 AND night_fee = 0;

-- Add comment to document the fee structure
COMMENT ON COLUMN operation_fills.open_fee IS 'Fee charged when opening the position';
COMMENT ON COLUMN operation_fills.close_fee IS 'Fee charged when closing the position';
COMMENT ON COLUMN operation_fills.night_fee IS 'Accumulated overnight/financing fees';
COMMENT ON COLUMN operation_fills.fee_currency IS 'Currency denomination for all fees';