
-- Ensure observations column exists in customers table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'customers' 
        AND column_name = 'observations'
    ) THEN
        ALTER TABLE customers ADD COLUMN observations text;
    END IF;
END $$;
