/*
  # Populate accounts table with mock data

  1. New Data
    - Insert two mock accounts from MOCK_ACCOUNTS constant
    - Revolut CFD account with $10,000 starting balance
    - XTB CFD account with $25,000 starting balance

  2. Features
    - Uses same IDs as mock data for consistency
    - Safe to re-run with ON CONFLICT handling
    - Sets current_balance equal to starting_balance
    - Extracts broker names from account names
    - Proper timestamp formatting
*/

-- Insert mock accounts data
INSERT INTO accounts (
  id,
  name,
  starting_balance,
  current_balance,
  broker,
  account_type,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  'acc_1',
  'Revolut CFD',
  10000.00,
  10000.00,
  'Revolut',
  'cfd',
  true,
  '2023-01-15T09:00:00Z',
  '2023-01-15T09:00:00Z'
),
(
  'acc_2',
  'XTB CFD',
  25000.00,
  25000.00,
  'XTB',
  'cfd',
  true,
  '2023-03-20T14:30:00Z',
  '2023-03-20T14:30:00Z'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  starting_balance = EXCLUDED.starting_balance,
  current_balance = EXCLUDED.current_balance,
  broker = EXCLUDED.broker,
  account_type = EXCLUDED.account_type,
  is_active = EXCLUDED.is_active,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;