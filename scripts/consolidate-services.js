import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function consolidateServices() {
  const client = await pool.connect();
  
  try {
    console.log('Starting services consolidation...');
    
    // 1. Create new unified services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS unified_services (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description TEXT,
        default_price DECIMAL(10,2) DEFAULT 0.00,
        estimated_duration INTEGER,
        is_active BOOLEAN DEFAULT true,
        is_recurring BOOLEAN DEFAULT false,
        interval_months INTEGER,
        loyalty_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Migrate data from service_types
    console.log('Migrating service types...');
    await client.query(`
      INSERT INTO unified_services (name, description, default_price, estimated_duration, is_active, is_recurring, interval_months, loyalty_points, created_at, updated_at)
      SELECT name, description, default_price, estimated_duration, is_active, is_recurring, interval_months, loyalty_points, created_at, updated_at
      FROM service_types
      WHERE NOT EXISTS (
        SELECT 1 FROM unified_services WHERE unified_services.name = service_types.name
      );
    `);

    // 3. Migrate data from service_extras  
    console.log('Migrating service extras...');
    await client.query(`
      INSERT INTO unified_services (name, description, default_price, is_active, created_at, updated_at)
      SELECT descricao as name, CONCAT('Serviço adicional: ', descricao) as description, valor_padrao as default_price, is_active, created_at, updated_at
      FROM service_extras
      WHERE NOT EXISTS (
        SELECT 1 FROM unified_services WHERE unified_services.name = service_extras.descricao
      );
    `);

    // 4. Update services table to use unified_services
    console.log('Updating services foreign key...');
    
    // Add new column
    await client.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS unified_service_id INTEGER REFERENCES unified_services(id);
    `);

    // Migrate existing service_type_id references
    await client.query(`
      UPDATE services 
      SET unified_service_id = (
        SELECT us.id 
        FROM unified_services us 
        JOIN service_types st ON st.name = us.name 
        WHERE st.id = services.service_type_id
      )
      WHERE service_type_id IS NOT NULL;
    `);

    // 5. Create new service_items table for multiple services per appointment
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_items (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES services(id) ON DELETE CASCADE NOT NULL,
        unified_service_id INTEGER REFERENCES unified_services(id) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. Migrate existing service_extras_items
    console.log('Migrating service extras items...');
    await client.query(`
      INSERT INTO service_items (service_id, unified_service_id, valor, observacao, created_at)
      SELECT 
        sei.service_id,
        us.id as unified_service_id,
        sei.valor,
        sei.observacao,
        sei.created_at
      FROM service_extras_items sei
      JOIN service_extras se ON se.id = sei.service_extra_id
      JOIN unified_services us ON us.name = se.descricao;
    `);

    // 7. Create main service item for each service (the original service type)
    await client.query(`
      INSERT INTO service_items (service_id, unified_service_id, valor, observacao)
      SELECT 
        s.id as service_id,
        s.unified_service_id,
        COALESCE(s.estimated_value, us.default_price, 0) as valor,
        'Serviço principal' as observacao
      FROM services s
      JOIN unified_services us ON us.id = s.unified_service_id
      WHERE s.unified_service_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM service_items si 
        WHERE si.service_id = s.id AND si.unified_service_id = s.unified_service_id
      );
    `);

    console.log('Services consolidation completed successfully!');
    
  } catch (error) {
    console.error('Error during consolidation:', error);
    throw error;
  } finally {
    client.release();
  }
}

consolidateServices()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });