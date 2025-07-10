import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPhotosConstraint() {
  try {
    console.log('Fixing photos table category constraint...');
    
    // Drop the existing constraint
    await pool.query('ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_category_check');
    console.log('Dropped old constraint');
    
    // Add the correct constraint
    await pool.query(`
      ALTER TABLE photos ADD CONSTRAINT photos_category_check 
      CHECK (category IN ('vehicle', 'service', 'damage', 'before', 'after', 'other'))
    `);
    console.log('Added new constraint with correct values');
    
    // Also check and fix entity_type constraint if needed
    await pool.query('ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_entity_type_check');
    await pool.query(`
      ALTER TABLE photos ADD CONSTRAINT photos_entity_type_check 
      CHECK (entity_type IN ('customer', 'vehicle', 'service'))
    `);
    console.log('Fixed entity_type constraint');
    
    console.log('Photos constraint fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing photos constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixPhotosConstraint().catch(console.error);