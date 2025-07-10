
-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  mime_type VARCHAR NOT NULL,
  size INTEGER NOT NULL,
  url VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR CHECK (category IN ('vehicle', 'service', 'damage', 'before', 'after', 'other')) DEFAULT 'other',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photos_customer_id ON photos(customer_id);
CREATE INDEX IF NOT EXISTS idx_photos_vehicle_id ON photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_photos_service_id ON photos(service_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
