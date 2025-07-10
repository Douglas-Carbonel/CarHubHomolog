
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Versão do PostgreSQL:', result.rows[0].version);
    
    client.release();
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testConnection()
  .then(() => console.log('🎉 Teste de conexão concluído!'))
  .catch(error => {
    console.error('💥 Falha no teste de conexão:', error);
    process.exit(1);
  });
