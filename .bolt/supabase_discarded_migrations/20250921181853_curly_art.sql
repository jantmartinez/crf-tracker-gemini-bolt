/*
  # Populate accounts table with mock data

  1. Data Insertion
    - Insert Revolut CFD account with $10,000 starting balance
    - Insert XTB CFD account with $25,000 starting balance
  
  2. Features
    - Uses fixed UUIDs matching mock data IDs
    - Safe to re-run with ON CONFLICT clause
    - Sets current_balance equal to starting_balance
*/

INSERT INTO accounts (
  id,
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