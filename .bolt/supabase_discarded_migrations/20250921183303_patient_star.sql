/*
  # Create default user profile

  1. New Profile
    - `id` (uuid, auto-generated)
    - `base_currency` (USD)
    - `risk_per_trade` (2.5%)
    - `default_leverage` (5x)
    - `created_at` (current timestamp)
    - `updated_at` (current timestamp)

  2. Features
    - Uses default settings from constants
    - Safe to re-run with conflict handling
    - Matches current schema structure
*/

INSERT INTO profiles (
  id,
  base_currency,
  risk_per_trade,
  default_leverage,
  created_at,
  updated_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
  'USD',
  2.5,
  5,
  '2023-01-01T00:00:00Z'::timestamptz,
  '2023-01-01T00:00:00Z'::timestamptz
) ON CONFLICT (id) DO UPDATE SET
  base_currency = EXCLUDED.base_currency,
  risk_per_trade = EXCLUDED.risk_per_trade,
  default_leverage = EXCLUDED.default_leverage,
  updated_at = EXCLUDED.updated_at;