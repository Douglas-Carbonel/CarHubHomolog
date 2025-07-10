
-- Create service_extras table for service add-ons
CREATE TABLE service_extras (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR NOT NULL,
  valor_padrao DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create service_extras_items table to store the extras selected for each service
CREATE TABLE service_extras_items (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  service_extra_id INTEGER REFERENCES service_extras(id),
  valor DECIMAL(10, 2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some default service extras
INSERT INTO service_extras (descricao, valor_padrao) VALUES
('Lavagem Simples', 25.00),
('Higienização Interna', 80.00),
('Cristalização', 150.00),
('Check-up gratuito (freios, suspensão, óleo, etc.)', 0.00),
('Diagnóstico eletrônico completo', 120.00),
('Carro reserva', 50.00),
('Instalação de peças do cliente', 100.00);
