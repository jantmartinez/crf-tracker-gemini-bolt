/*
  # Create Mock Profile

  1. New Data
    - Mock profile with default trading settings
    - Base currency: USD
    - Risk per trade: 2.5%
    - Default leverage: 5x

  2. Features
    - Uses fixed UUID for consistency
    - Safe to re-run with ON CONFLICT handling
    - Matches DEFAULT_SETTINGS from constants.ts
*/

-- Insert mock profile data
INSERT INTO profiles (
  id,
  user_id,
  base_currency,
  risk_per_trade,
  default_leverage,
  created_at,
  updated_at
) VALUES (
  'profile_1'::uuid,
  'user_1'::uuid,
  'USD',
  2.5,
  5,
  '2023-01-01T00:00:00Z',
  '2023-01-01T00:00:00Z'
) ON CONFLICT (id) DO UPDATE SET
  base_currency = EXCLUDED.base_currency,
  risk_per_trade = EXCLUDED.risk_per_trade,
  default_leverage = EXCLUDED.default_leverage,
  updated_at = NOW();