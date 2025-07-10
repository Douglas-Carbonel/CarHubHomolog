
-- Drop and recreate users table with correct structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'technician',
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert admin user
INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
VALUES (
  'admin', 
  '$2b$10$8K1p/a0dclsgI22L/h5F9.cWx8Zm7H5bK5Pw/1wKIxtVMRg1KK1g2', 
  'admin@carhub.com', 
  'Administrador', 
  'Sistema', 
  'admin', 
  true, 
  ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
);

-- Recreate foreign key constraints for services table
ALTER TABLE services 
ADD CONSTRAINT services_technician_id_users_id_fk 
FOREIGN KEY (technician_id) REFERENCES users(id);
