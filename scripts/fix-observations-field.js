
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function fixObservationsField() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Conectando ao banco de dados...');
    
    // Verificar se a tabela customers existe
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'customers'
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ Tabela customers não encontrada!');
      return;
    }
    
    console.log('✅ Tabela customers encontrada');
    
    // Verificar colunas existentes
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas existentes na tabela customers:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Verificar se o campo observations existe
    const hasObservations = columnsResult.rows.some(row => row.column_name === 'observations');
    
    if (!hasObservations) {
      console.log('⚠️  Campo observations não encontrado. Adicionando...');
      
      await pool.query(`
        ALTER TABLE customers 
        ADD COLUMN observations text
      `);
      
      console.log('✅ Campo observations adicionado com sucesso!');
    } else {
      console.log('✅ Campo observations já existe na tabela');
    }
    
    // Verificar novamente após a alteração
    const updatedColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customers' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura final da tabela customers:');
    updatedColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar operação:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar o script
fixObservationsField()
  .then(() => {
    console.log('🎉 Script executado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Falha na execução do script:', error);
    process.exit(1);
  });
