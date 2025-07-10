
-- Add payment method fields to services table
ALTER TABLE services 
ADD COLUMN pix_pago NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN dinheiro_pago NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN cheque_pago NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN cartao_pago NUMERIC(10, 2) DEFAULT 0.00;
