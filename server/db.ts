import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

// Database connection configuration
const getDatabaseUrl = () => {
  // Try environment variable first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback to Supabase connection string
  return "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
};

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export const db = drizzle(pool, { schema });