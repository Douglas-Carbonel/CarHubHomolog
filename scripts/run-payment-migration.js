
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function runPaymentMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Executando migração de métodos de pagamento...');

    // Verificar se as colunas já existem
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name IN ('pix_pago', 'dinheiro_pago', 'cheque_pago', 'cartao_pago')
    `);

    if (checkColumns.rows.length === 4) {
      console.log('✅ Colunas de pagamento já existem no banco de dados.');
      return;
    }

    // Adicionar as colunas
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS pix_pago NUMERIC(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS dinheiro_pago NUMERIC(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cheque_pago NUMERIC(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cartao_pago NUMERIC(10, 2) DEFAULT 0.00;
    `);

    console.log('✅ Colunas de pagamento adicionadas com sucesso!');

    // Verificar se foram criadas
    const verifyColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name LIKE '%_pago' 
      ORDER BY column_name;
    `);

    console.log('📊 Colunas de pagamento encontradas:', verifyColumns.rows);

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runPaymentMigration().catch(console.error);
