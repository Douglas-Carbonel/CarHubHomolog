
-- Create service_items table for multiple service types per service
CREATE TABLE IF NOT EXISTS service_items (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_type_id INTEGER NOT NULL REFERENCES service_types(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id);
CREATE INDEX IF NOT EXISTS idx_service_items_service_type_id ON service_items(service_type_id);

-- Migrate existing services to service_items
-- This will create service_items entries for existing services based on their serviceTypeId
INSERT INTO service_items (service_id, service_type_id, quantity, unit_price, total_price)
SELECT 
  s.id as service_id,
  s.service_type_id,
  1 as quantity,
  COALESCE(s.estimated_value, st.default_price, '0.00') as unit_price,
  COALESCE(s.estimated_value, st.default_price, '0.00') as total_price
FROM services s
LEFT JOIN service_types st ON s.service_type_id = st.id
WHERE s.service_type_id IS NOT NULL;

-- Make service_type_id nullable since we're using service_items now
ALTER TABLE services ALTER COLUMN service_type_id DROP NOT NULL;
