
-- Migration to add valor_pago column to services table
ALTER TABLE services 
ADD COLUMN valor_pago DECIMAL(10,2) DEFAULT 0.00;
