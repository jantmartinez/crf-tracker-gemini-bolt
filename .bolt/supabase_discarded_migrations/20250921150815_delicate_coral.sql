/*
  # Populate accounts table with mock data

  1. Data Population
    - Insert mock accounts from constants.ts
    - Revolut CFD account with $10,000 starting balance
    - XTB CFD account with $25,000 starting balance
  
  2. Notes
    - Uses fixed UUIDs for consistency
    - Sets user_id to NULL since no authentication is implemented yet
    - Accounts are marked as active
    - Created dates match the mock data
*/

-- Insert mock accounts data
INSERT INTO accounts (
  id,
  user_id,
  name,
  starting_balance,
  current_balance,
  broker,
  account_type,
  is_active,
  created_at
) VALUES 
(
  'acc_1'::uuid,
  NULL, -- No user authentication yet
  'Revolut CFD',
  10000.00,
  10000.00,
  'Revolut',
  'cfd',
  true,
  '2023-01-15T09:00:00Z'::timestamptz
),
(
  'acc_2'::uuid,
  NULL, -- No user authentication yet
  'XTB CFD', 
  25000.00,
  25000.00,
  'XTB',
  'cfd',
  true,
  '2023-03-20T14:30:00Z'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  starting_balance = EXCLUDED.starting_balance,
  current_balance = EXCLUDED.current_balance,
  broker = EXCLUDED.broker,
  account_type = EXCLUDED.account_type,
  is_active = EXCLUDED.is_active,
  created_at = EXCLUDED.created_at;