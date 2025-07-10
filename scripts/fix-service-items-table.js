const { db } = require('../server/db.ts');
const { sql } = require('drizzle-orm');

async function fixServiceItemsTable() {
  try {
    console.log('Checking and fixing service_items table...');
    
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'service_items'
      )
    `);
    
    if (!tableCheck[0].exists) {
      console.log('Creating service_items table...');
      await db.execute(sql`
        CREATE TABLE service_items (
          id SERIAL PRIMARY KEY,
          service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
          service_type_id INTEGER NOT NULL REFERENCES service_types(id),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total_price DECIMAL(10,2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create indexes
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_service_items_service_type_id ON service_items(service_type_id)
      `);
      
      console.log('Table and indexes created successfully');
    } else {
      console.log('Table exists, checking structure...');
      const columns = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'service_items' 
        ORDER BY ordinal_position
      `);
      
      console.log('Current columns:');
      columns.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    }

  } catch (error) {
    console.error('Error fixing service_items table:', error);
  }
}

if (require.main === module) {
  fixServiceItemsTable();
}

module.exports = { fixServiceItemsTable };