/*
  # Populate symbols for watchlist

  1. New Symbols
    - `AMD` - Advanced Micro Devices, Inc.
    - `PLTR` - Palantir Technologies Inc.
  2. Purpose
    - Provides symbols for the watchlist functionality
    - Sets realistic current prices for demo purposes
*/

INSERT INTO symbols (ticker, name, exchange, last_price, currency, is_active) VALUES
('AMD', 'Advanced Micro Devices, Inc.', 'NASDAQ', 165.43, 'USD', true),
('PLTR', 'Palantir Technologies Inc.', 'NYSE', 25.11, 'USD', true)
ON CONFLICT (ticker) DO UPDATE SET
  name = EXCLUDED.name,
  exchange = EXCLUDED.exchange,
  last_price = EXCLUDED.last_price,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active;