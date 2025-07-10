import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function removeDocumentConstraint() {
  try {
    console.log("Removing UNIQUE constraint from customers.document...");
    
    await pool.query(`
      ALTER TABLE customers 
      DROP CONSTRAINT IF EXISTS customers_document_key;
    `);
    
    console.log("✓ UNIQUE constraint removed successfully");
    console.log("Customers can now be created without unique document requirement");
    
  } catch (error) {
    console.error("Error removing constraint:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

removeDocumentConstraint().catch(console.error);