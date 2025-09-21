/*
  # Relax RLS policies for private deployment

  * Allow public (anon + authenticated) clients to manage domain tables without auth
  * Replaces authenticated-only policies that blocked anonymous usage
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can read symbols" ON symbols;
DROP POLICY IF EXISTS "Authenticated users can insert symbols" ON symbols;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can read own operation groups" ON operation_groups;
DROP POLICY IF EXISTS "Users can insert own operation groups" ON operation_groups;
DROP POLICY IF EXISTS "Users can update own operation groups" ON operation_groups;
DROP POLICY IF EXISTS "Users can read own operation fills" ON operation_fills;
DROP POLICY IF EXISTS "Users can insert own operation fills" ON operation_fills;
DROP POLICY IF EXISTS "Anyone can read intelligence data" ON intelligence_data;
DROP POLICY IF EXISTS "Anyone can read news items" ON news_items;

-- Symbols policies
CREATE POLICY "Public read symbols"
  ON symbols
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert symbols"
  ON symbols
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Public read profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert profiles"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update profiles"
  ON profiles
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Accounts policies
CREATE POLICY "Public read accounts"
  ON accounts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert accounts"
  ON accounts
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update accounts"
  ON accounts
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Operation groups policies
CREATE POLICY "Public read operation groups"
  ON operation_groups
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert operation groups"
  ON operation_groups
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update operation groups"
  ON operation_groups
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Operation fills policies
CREATE POLICY "Public read operation fills"
  ON operation_fills
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert operation fills"
  ON operation_fills
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update operation fills"
  ON operation_fills
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Public read access for reference data
CREATE POLICY "Public read intelligence data"
  ON intelligence_data
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read news items"
  ON news_items
  FOR SELECT
  TO public
  USING (true);
