/*
  # Update mock accounts with user profile ID

  This migration updates existing mock accounts to be associated with a user profile,
  ensuring they are visible through RLS policies.

  1. Changes Made
     - Updates accounts with NULL user_id to be associated with the first available profile
     - Ensures mock accounts are visible to authenticated users
  
  2. Security
     - Maintains RLS policies while making existing data accessible
     - Only updates accounts that don't already have a user_id assigned

  Note: This assumes you have at least one profile in the profiles table.
  If no profiles exist, you may need to create one first through the application.
*/

-- Update accounts that don't have a user_id assigned
-- This will associate them with the first available profile
UPDATE accounts 
SET user_id = (
  SELECT id 
  FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE user_id IS NULL 
  AND EXISTS (SELECT 1 FROM profiles);

-- If no profiles exist, create a default one first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles) THEN
    INSERT INTO profiles (base_currency, risk_per_trade, default_leverage)
    VALUES ('USD', 2.5, 5);
    
    -- Now update the accounts with the newly created profile
    UPDATE accounts 
    SET user_id = (
      SELECT id 
      FROM profiles 
      ORDER BY created_at ASC 
      LIMIT 1
    )
    WHERE user_id IS NULL;
  END IF;
END $$;