
-- Add observations column to customers table if it doesn't exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS observations text;
