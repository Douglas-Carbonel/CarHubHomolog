import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixExistingPhotos() {
  try {
    console.log('Checking existing photo categories...');
    
    // Check what category values exist
    const categories = await pool.query('SELECT DISTINCT category FROM photos');
    console.log('Existing categories:', categories.rows);
    
    // Update any invalid categories to 'other'
    const validCategories = ['vehicle', 'service', 'damage', 'before', 'after', 'other'];
    
    for (const row of categories.rows) {
      if (row.category && !validCategories.includes(row.category)) {
        console.log(`Updating invalid category "${row.category}" to "other"`);
        await pool.query(
          'UPDATE photos SET category = $1 WHERE category = $2',
          ['other', row.category]
        );
      }
    }
    
    // Also check for null categories
    await pool.query('UPDATE photos SET category = $1 WHERE category IS NULL', ['other']);
    
    // Now try to add the constraint
    await pool.query('ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_category_check');
    await pool.query(`
      ALTER TABLE photos ADD CONSTRAINT photos_category_check 
      CHECK (category IN ('vehicle', 'service', 'damage', 'before', 'after', 'other'))
    `);
    console.log('Added category constraint successfully');
    
    // Fix entity_type constraint
    await pool.query('ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_entity_type_check');
    await pool.query(`
      ALTER TABLE photos ADD CONSTRAINT photos_entity_type_check 
      CHECK (entity_type IN ('customer', 'vehicle', 'service'))
    `);
    console.log('Added entity_type constraint successfully');
    
    console.log('Photos table fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing photos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixExistingPhotos().catch(console.error);