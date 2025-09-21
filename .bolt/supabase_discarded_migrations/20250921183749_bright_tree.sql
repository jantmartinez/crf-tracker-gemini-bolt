/*
  # Populate accounts table with mock data

  1. New Records
    - Revolut CFD account with $10,000 starting balance
    - XTB CFD account with $25,000 starting balance
  
  2. Features
    - Auto-generated UUIDs for primary keys
    - Extracted broker names from account names
    - Proper timestamp formatting
    - Safe to re-run with conflict handling on name field
*/

-- Insert Revolut CFD account
INSERT INTO accounts (
  name,
  starting_balance,
  current_balance,
  broker,
  account_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Revolut CFD',
  10000.00,
  10000.00,
  'Revolut',
  'cfd',
  true,
  '2023-01-15T09:00:00Z',
  '2023-01-15T09:00:00Z'
) ON CONFLICT (name) DO NOTHING;

-- Insert XTB CFD account
INSERT INTO accounts (
  name,
  starting_balance,
  current_balance,
  broker,
  account_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  'XTB CFD',
  25000.00,
  25000.00,
  'XTB',
  'cfd',
  true,
  '2023-03-20T14:30:00Z',
  '2023-03-20T14:30:00Z'
) ON CONFLICT (name) DO NOTHING;