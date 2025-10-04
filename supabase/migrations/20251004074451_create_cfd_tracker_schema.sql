/*
  # Create CFD Tracker Pro Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `base_currency` (text) - Default trading currency
      - `risk_per_trade` (numeric) - Risk percentage per trade (0-100)
      - `default_leverage` (numeric) - Default leverage multiplier
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `accounts`
      - `id` (uuid, primary key)
      - `name` (text) - Account name
      - `starting_balance` (numeric) - Initial account balance
      - `current_balance` (numeric) - Current account balance
      - `is_active` (boolean) - Account active status
      - `open_close_commission` (numeric) - Commission rate for opening/closing positions (default: 0.25%)
      - `night_commission` (numeric) - Daily commission rate for overnight positions (default: 7.0%)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `symbols`
      - `id` (uuid, primary key)
      - `ticker` (text, unique) - Stock ticker symbol
      - `name` (text) - Company/asset name
      - `currency` (text) - Trading currency
      - `last_price` (numeric) - Last known price
      - `is_active` (boolean) - Symbol active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `operation_groups`
      - `id` (uuid, primary key)
      - `account_id` (uuid, foreign key) - References accounts
      - `symbol_id` (uuid, foreign key) - References symbols
      - `status` (text) - Operation status (open/closed)
      - `closed_at` (timestamptz) - When position was closed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `operation_fills`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key) - References operation_groups
      - `side` (text) - Buy or sell
      - `quantity` (numeric) - Number of units
      - `price` (numeric) - Execution price
      - `fees` (numeric) - Total fees (backward compatibility)
      - `open_fee` (numeric) - Fee charged when opening the position
      - `close_fee` (numeric) - Fee charged when closing the position
      - `night_fee` (numeric) - Accumulated night/overnight fees
      - `fee_currency` (text) - Currency for the fees (default USD)
      - `leverage` (numeric) - Leverage used
      - `fill_timestamp` (timestamptz) - When fill was executed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since no auth is implemented)
    - In production, these should be restricted to authenticated users

  3. Indexes
    - Add indexes for frequently queried columns
    - Foreign key indexes for join performance
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text DEFAULT 'USD' NOT NULL,
  risk_per_trade numeric(5,2) DEFAULT 2.5 CHECK (risk_per_trade >= 0 AND risk_per_trade <= 100),
  default_leverage numeric(5,2) DEFAULT 5.0 CHECK (default_leverage >= 1),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starting_balance numeric(15,2) NOT NULL CHECK (starting_balance >= 0),
  current_balance numeric(15,2) NOT NULL CHECK (current_balance >= 0),
  is_active boolean DEFAULT true NOT NULL,
  open_close_commission numeric(5,2) DEFAULT 0.25 CHECK (open_close_commission >= 0 AND open_close_commission <= 100),
  night_commission numeric(5,2) DEFAULT 7.0 CHECK (night_commission >= 0 AND night_commission <= 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create symbols table
CREATE TABLE IF NOT EXISTS symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text UNIQUE NOT NULL,
  name text NOT NULL,
  currency text DEFAULT 'USD' NOT NULL,
  last_price numeric(15,4),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create operation_groups table
CREATE TABLE IF NOT EXISTS operation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol_id uuid NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed')),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create operation_fills table
CREATE TABLE IF NOT EXISTS operation_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES operation_groups(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric(15,4) NOT NULL CHECK (quantity > 0),
  price numeric(15,4) NOT NULL CHECK (price > 0),
  fees numeric(15,4) DEFAULT 0 CHECK (fees >= 0),
  open_fee numeric(15,4) DEFAULT 0 CHECK (open_fee >= 0),
  close_fee numeric(15,4) DEFAULT 0 CHECK (close_fee >= 0),
  night_fee numeric(15,4) DEFAULT 0 CHECK (night_fee >= 0),
  fee_currency text DEFAULT 'USD' NOT NULL,
  leverage numeric(5,2) DEFAULT 1.0 CHECK (leverage >= 1),
  fill_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_symbols_ticker ON symbols(ticker);
CREATE INDEX IF NOT EXISTS idx_symbols_is_active ON symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_operation_groups_account_id ON operation_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_operation_groups_symbol_id ON operation_groups(symbol_id);
CREATE INDEX IF NOT EXISTS idx_operation_groups_status ON operation_groups(status);
CREATE INDEX IF NOT EXISTS idx_operation_fills_group_id ON operation_fills(group_id);
CREATE INDEX IF NOT EXISTS idx_operation_fills_side ON operation_fills(side);
CREATE INDEX IF NOT EXISTS idx_operation_fills_open_fee ON operation_fills(open_fee);
CREATE INDEX IF NOT EXISTS idx_operation_fills_close_fee ON operation_fills(close_fee);
CREATE INDEX IF NOT EXISTS idx_operation_fills_night_fee ON operation_fills(night_fee);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_fills ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (temporary - should be restricted in production)
-- Note: Since no authentication is implemented, we allow public access
-- In production, these should check auth.uid() or similar

CREATE POLICY "Allow public read access to profiles"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to profiles"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to profiles"
  ON profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to profiles"
  ON profiles FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to accounts"
  ON accounts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to accounts"
  ON accounts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to accounts"
  ON accounts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to accounts"
  ON accounts FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to symbols"
  ON symbols FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to symbols"
  ON symbols FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to symbols"
  ON symbols FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to symbols"
  ON symbols FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to operation_groups"
  ON operation_groups FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to operation_groups"
  ON operation_groups FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to operation_groups"
  ON operation_groups FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to operation_groups"
  ON operation_groups FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to operation_fills"
  ON operation_fills FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to operation_fills"
  ON operation_fills FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to operation_fills"
  ON operation_fills FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to operation_fills"
  ON operation_fills FOR DELETE
  TO public
  USING (true);

-- Add comments to document the schema
COMMENT ON TABLE profiles IS 'User trading profile settings';
COMMENT ON TABLE accounts IS 'Trading accounts with balance tracking';
COMMENT ON TABLE symbols IS 'Stock and asset symbols available for trading';
COMMENT ON TABLE operation_groups IS 'Groups of related trading operations';
COMMENT ON TABLE operation_fills IS 'Individual fills (executions) within operation groups';

COMMENT ON COLUMN operation_fills.open_fee IS 'Fee charged when opening the position';
COMMENT ON COLUMN operation_fills.close_fee IS 'Fee charged when closing the position';
COMMENT ON COLUMN operation_fills.night_fee IS 'Accumulated overnight/financing fees';
COMMENT ON COLUMN operation_fills.fee_currency IS 'Currency denomination for all fees';