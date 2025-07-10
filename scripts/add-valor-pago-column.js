
import { Pool } from 'pg';
import { config } from 'dotenv';

config();

async function addValorPagoColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Conectando ao banco de dados...');

    // Verificar se a coluna já existe
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name = 'valor_pago'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna valor_pago já existe na tabela services');
    } else {
      console.log('Adicionando coluna valor_pago à tabela services...');
      
      await pool.query(`
        ALTER TABLE services 
        ADD COLUMN valor_pago DECIMAL(10,2) DEFAULT 0.00;
      `);
      
      console.log('✅ Coluna valor_pago adicionada com sucesso!');
    }

    // Verificar a estrutura final da tabela
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura da tabela services:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    await pool.end();
  }
}

addValorPagoColumn();
