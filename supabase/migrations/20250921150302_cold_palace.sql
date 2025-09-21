/*
  # Seed Initial Data

  This migration populates the database with initial symbols and sample data
  that corresponds to the mock data used in the application.
*/

-- Insert symbols from mock data
INSERT INTO symbols (ticker, name, exchange, currency, last_price, price_updated_at) VALUES
('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 150.00, now()),
('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 2800.00, now()),
('TSLA', 'Tesla, Inc.', 'NASDAQ', 'USD', 700.00, now()),
('AMZN', 'Amazon.com, Inc.', 'NASDAQ', 'USD', 3100.00, now()),
('MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 300.00, now()),
('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', 1000.00, now()),
('META', 'Meta Platforms, Inc.', 'NASDAQ', 'USD', 480.00, now()),
('AMD', 'Advanced Micro Devices, Inc.', 'NASDAQ', 'USD', 165.43, now()),
('PLTR', 'Palantir Technologies Inc.', 'NYSE', 'USD', 25.11, now())
ON CONFLICT (ticker) DO UPDATE SET
  name = EXCLUDED.name,
  exchange = EXCLUDED.exchange,
  last_price = EXCLUDED.last_price,
  price_updated_at = EXCLUDED.price_updated_at;