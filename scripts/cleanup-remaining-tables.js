
import { sql } from 'drizzle-orm';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Configuração da conexão com o banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool);

async function cleanupRemainingTables() {
  try {
    console.log('🔍 Verificando tabelas restantes para limpeza...');
    
    // Verificar se as tabelas existem
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('service_extras_items', 'unified_services')
      ORDER BY table_name
    `);
    
    const existingTables = tablesCheck.rows.map(row => row.table_name);
    
    if (existingTables.length === 0) {
      console.log('✅ Nenhuma tabela restante encontrada para limpeza');
      return;
    }
    
    console.log(`📋 Tabelas encontradas: ${existingTables.join(', ')}`);
    
    // Verificar se há dados nas tabelas antes de remover
    for (const tableName of existingTables) {
      const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
      const count = countResult.rows[0]?.count || 0;
      console.log(`📊 ${tableName}: ${count} registros`);
      
      if (count > 0) {
        console.log(`⚠️  ATENÇÃO: A tabela ${tableName} contém ${count} registros!`);
        console.log(`   Verifique se esses dados são importantes antes de continuar.`);
      }
    }
    
    // Remover as tabelas (service_extras_items primeiro devido à foreign key)
    if (existingTables.includes('service_extras_items')) {
      console.log('🗑️  Removendo tabela service_extras_items...');
      await db.execute(sql`DROP TABLE IF EXISTS service_extras_items CASCADE`);
      console.log('✅ Tabela service_extras_items removida');
    }
    
    if (existingTables.includes('unified_services')) {
      console.log('🗑️  Removendo tabela unified_services...');
      await db.execute(sql`DROP TABLE IF EXISTS unified_services CASCADE`);
      console.log('✅ Tabela unified_services removida');
    }
    
    // Verificação final da estrutura
    console.log('');
    console.log('🎉 Limpeza final concluída!');
    console.log('');
    console.log('📋 Estrutura final de tabelas de serviços:');
    console.log('   ✅ service_types: Tipos de serviços disponíveis');
    console.log('   ✅ services: Ordens de serviço principais');
    console.log('   ✅ service_items: Itens/tipos por ordem de serviço');
    console.log('   ❌ Tabelas legadas removidas: service_extras, service_extras_items, unified_services');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza final:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupRemainingTables()
    .then(() => {
      console.log('✅ Script de limpeza final executado com sucesso');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Falha na limpeza final:', error);
      process.exit(1);
    });
}

export { cleanupRemainingTables };
