/*
  # CFD Tracker Database Schema

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `starting_balance` (numeric)
      - `current_balance` (numeric)
      - `broker` (text, optional)
      - `account_type` (text, default 'cfd')
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `operation_groups` (for grouping related trades)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `account_id` (uuid, foreign key)
      - `symbol_id` (uuid, foreign key)
      - `status` (text: 'open', 'closed')
      - `strategy` (text, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `closed_at` (timestamp, optional)
      - `updated_at` (timestamp)

    - `operation_fills` (individual buy/sell executions)
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to operation_groups)
      - `side` (text: 'buy', 'sell')
      - `quantity` (numeric)
      - `price` (numeric)
      - `fees` (numeric, default 0)
      - `leverage` (integer, default 1)
      - `fill_timestamp` (timestamp)
      - `note` (text, optional)
      - `created_at` (timestamp)

    - `symbols` (stock/asset information)
      - `id` (uuid, primary key)
      - `ticker` (text, unique)
      - `exchange` (text, optional)
      - `name` (text, optional)
      - `asset_type` (text, default 'equity_cfd')
      - `currency` (text, default 'USD')
      - `last_price` (numeric, optional)
      - `price_updated_at` (timestamp, optional)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `profiles` (user settings)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `base_currency` (text, default 'USD')
      - `risk_per_trade` (numeric, default 2.5)
      - `default_leverage` (integer, default 5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `intelligence_data` (AI analysis cache)
      - `id` (uuid, primary key)
      - `symbol_id` (uuid, foreign key)
      - `data_type` (text: 'analyst_consensus', 'technical_indicators')
      - `data` (jsonb)
      - `source` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `news_items` (news articles)
      - `id` (uuid, primary key)
      - `symbol_id` (uuid, foreign key, optional)
      - `headline` (text)
      - `summary` (text, optional)
      - `content` (text, optional)
      - `source` (text, optional)
      - `author` (text, optional)
      - `published_at` (timestamp, optional)
      - `url` (text, optional)
      - `sentiment` (text: 'positive', 'negative', 'neutral', optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Public read access for symbols, intelligence_data, and news_items

  3. Indexes
    - Add indexes for frequently queried fields
    - Foreign key indexes for better join performance
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create symbols table (public data)
CREATE TABLE IF NOT EXISTS symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text UNIQUE NOT NULL,
  exchange text,
  name text,
  asset_type text DEFAULT 'equity_cfd',
  currency text NOT NULL DEFAULT 'USD',
  last_price numeric(15,4),
  price_updated_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table (user settings)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'USD',
  risk_per_trade numeric(5,2) DEFAULT 2.5,
  default_leverage integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  starting_balance numeric(15,2) NOT NULL,
  current_balance numeric(15,2),
  broker text,
  account_type text DEFAULT 'cfd',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create operation_groups table
CREATE TABLE IF NOT EXISTS operation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  symbol_id uuid REFERENCES symbols(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  strategy text,
  notes text,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Create operation_fills table
CREATE TABLE IF NOT EXISTS operation_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES operation_groups(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric(15,4) NOT NULL,
  price numeric(15,4) NOT NULL,
  fees numeric(15,2) DEFAULT 0,
  leverage integer DEFAULT 1,
  fill_timestamp timestamptz DEFAULT now(),
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create intelligence_data table
CREATE TABLE IF NOT EXISTS intelligence_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id uuid REFERENCES symbols(id) ON DELETE CASCADE,
  data_type text NOT NULL CHECK (data_type IN ('analyst_consensus', 'technical_indicators')),
  data jsonb NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(symbol_id, data_type)
);

-- Create news_items table
CREATE TABLE IF NOT EXISTS news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_id uuid REFERENCES symbols(id) ON DELETE CASCADE,
  headline text NOT NULL,
  summary text,
  content text,
  source text,
  author text,
  published_at timestamptz,
  url text,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_symbols_ticker ON symbols(ticker);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_groups_user_id ON operation_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_groups_status ON operation_groups(status);
CREATE INDEX IF NOT EXISTS idx_operation_fills_group_id ON operation_fills(group_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_data_symbol_id ON intelligence_data(symbol_id);
CREATE INDEX IF NOT EXISTS idx_news_items_symbol_id ON news_items(symbol_id);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);

-- Create triggers for updated_at columns
CREATE TRIGGER update_symbols_updated_at BEFORE UPDATE ON symbols FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operation_groups_updated_at BEFORE UPDATE ON operation_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_intelligence_data_updated_at BEFORE UPDATE ON intelligence_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Symbols: Anyone can read (public data)
CREATE POLICY "Anyone can read symbols" ON symbols FOR SELECT TO authenticated USING (true);

-- Profiles: Users can manage their own profile
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Accounts: Users can manage their own accounts
CREATE POLICY "Users can read own accounts" ON accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Operation Groups: Users can manage their own operations
CREATE POLICY "Users can read own operation groups" ON operation_groups FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own operation groups" ON operation_groups FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own operation groups" ON operation_groups FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Operation Fills: Users can manage fills for their own operations
CREATE POLICY "Users can read own operation fills" ON operation_fills FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM operation_groups WHERE operation_groups.id = operation_fills.group_id AND operation_groups.user_id = auth.uid()));
CREATE POLICY "Users can insert own operation fills" ON operation_fills FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM operation_groups WHERE operation_groups.id = operation_fills.group_id AND operation_groups.user_id = auth.uid()));

-- Intelligence Data: Anyone can read (public analysis data)
CREATE POLICY "Anyone can read intelligence data" ON intelligence_data FOR SELECT TO authenticated USING (true);

-- News Items: Anyone can read (public news data)
CREATE POLICY "Anyone can read news items" ON news_items FOR SELECT TO authenticated USING (true);