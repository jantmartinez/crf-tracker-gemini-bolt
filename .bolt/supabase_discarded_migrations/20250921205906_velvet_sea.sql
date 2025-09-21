/*
  # Add INSERT policy for symbols table

  1. Security
    - Add policy to allow authenticated users to insert new symbols
    - This enables the fetchOrCreateSymbol function to work properly
    - Symbols are reference data that authenticated users should be able to create
*/

CREATE POLICY "Authenticated users can insert symbols"
  ON symbols
  FOR INSERT
  TO authenticated
  WITH CHECK (true);