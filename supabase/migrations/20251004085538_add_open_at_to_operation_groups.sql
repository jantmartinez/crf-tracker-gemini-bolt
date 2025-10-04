/*
  # Add open_at column to operation_groups

  ## Changes
  
  1. Schema Changes
    - Add `open_at` column to `operation_groups` table
      - Type: timestamptz (timestamp with time zone)
      - Nullable: true (for existing records)
      - Purpose: Tracks when the position was actually opened (from first fill)
    
  2. Data Migration
    - Populate `open_at` with earliest fill_timestamp from operation_fills for existing records
    - If no fills exist, use created_at as fallback
  
  ## Notes
  
  - `created_at`: When the record was added to the database (useful for imports)
  - `open_at`: When the position was actually opened (from first fill)
  - `closed_at`: When the position was closed
*/

-- Add open_at column to operation_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operation_groups' AND column_name = 'open_at'
  ) THEN
    ALTER TABLE operation_groups ADD COLUMN open_at timestamptz;
  END IF;
END $$;

-- Populate open_at with the earliest fill_timestamp from operation_fills
UPDATE operation_groups og
SET open_at = COALESCE(
  (
    SELECT MIN(fill_timestamp)
    FROM operation_fills
    WHERE group_id = og.id
  ),
  og.created_at
)
WHERE open_at IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_operation_groups_open_at ON operation_groups(open_at);
