
-- Add loyalty fields to service_types table
ALTER TABLE service_types 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN interval_months INTEGER,
ADD COLUMN loyalty_points INTEGER DEFAULT 0;

-- Add loyalty points to customers table
ALTER TABLE customers 
ADD COLUMN loyalty_points INTEGER DEFAULT 0;

-- Create loyalty_tracking table
CREATE TABLE loyalty_tracking (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  service_type_id INTEGER NOT NULL REFERENCES service_types(id),
  last_service_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  status VARCHAR CHECK (status IN ('active', 'overdue', 'completed')) DEFAULT 'active',
  points INTEGER DEFAULT 0,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_loyalty_tracking_customer ON loyalty_tracking(customer_id);
CREATE INDEX idx_loyalty_tracking_vehicle ON loyalty_tracking(vehicle_id);
CREATE INDEX idx_loyalty_tracking_service_type ON loyalty_tracking(service_type_id);
CREATE INDEX idx_loyalty_tracking_due_date ON loyalty_tracking(next_due_date);
CREATE INDEX idx_loyalty_tracking_status ON loyalty_tracking(status);

-- Update existing service types with loyalty information
UPDATE service_types SET 
  is_recurring = TRUE, 
  interval_months = 6, 
  loyalty_points = 10 
WHERE name = 'Troca de Óleo';

UPDATE service_types SET 
  is_recurring = TRUE, 
  interval_months = 12, 
  loyalty_points = 15 
WHERE name = 'Alinhamento';

UPDATE service_types SET 
  is_recurring = TRUE, 
  interval_months = 12, 
  loyalty_points = 30 
WHERE name = 'Revisão Geral';

UPDATE service_types SET 
  is_recurring = FALSE, 
  loyalty_points = 20 
WHERE name = 'Troca de Pneus';

UPDATE service_types SET 
  is_recurring = FALSE, 
  loyalty_points = 5 
WHERE name = 'Lavagem';

UPDATE service_types SET 
  is_recurring = TRUE, 
  interval_months = 18, 
  loyalty_points = 18 
WHERE name = 'Freios';

UPDATE service_types SET 
  is_recurring = TRUE, 
  interval_months = 1, 
  loyalty_points = 8 
WHERE name = 'Higienização';

UPDATE service_types SET 
  is_recurring = FALSE, 
  loyalty_points = 15 
WHERE name = 'Reparo';

UPDATE service_types SET 
  is_recurring = FALSE, 
  loyalty_points = 5 
WHERE name = 'Outros';
