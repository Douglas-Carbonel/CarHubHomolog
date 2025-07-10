
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas existentes...');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verificar especificamente as tabelas que queremos checar
    const targetTables = ['service_extras_items', 'unified_services'];
    const existingTargets = result.rows
      .map(row => row.table_name)
      .filter(name => targetTables.includes(name));
    
    if (existingTargets.length > 0) {
      console.log('\n🎯 Tabelas alvo encontradas:');
      for (const tableName of existingTargets) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = countResult.rows[0]?.count || 0;
        console.log(`  - ${tableName}: ${count} registros`);
      }
    } else {
      console.log('\n✅ Nenhuma das tabelas alvo (service_extras_items, unified_services) foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
