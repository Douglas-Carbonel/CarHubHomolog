import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function addPixPaymentsTable() {
  try {
    console.log('Creating pix_payments table...');

    // Create the pix_payments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pix_payments (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id),
        mercadopago_id VARCHAR NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR DEFAULT 'pending',
        qr_code TEXT,
        qr_code_base64 TEXT,
        pix_copy_paste TEXT,
        expiration_date TIMESTAMP,
        approved_date TIMESTAMP,
        customer_email VARCHAR,
        customer_name VARCHAR,
        customer_document VARCHAR,
        external_reference VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_service_id ON pix_payments(service_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_mercadopago_id ON pix_payments(mercadopago_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status)
    `);

    console.log('✅ pix_payments table created successfully');

  } catch (error) {
    console.error('❌ Error creating pix_payments table:', error);
    throw error;
  }
}

addPixPaymentsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });