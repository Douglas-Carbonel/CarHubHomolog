import { Pool } from 'pg';
import { config } from 'dotenv';
import crypto from 'crypto';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Conectando ao banco de dados...');

    // Verificar se as colunas do sistema de fidelização já existem
    const checkLoyaltyColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND column_name = 'loyalty_points'
    `);

    const checkServiceTypeColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'service_types' 
      AND column_name IN ('is_recurring', 'interval_months', 'loyalty_points')
    `);

    const checkLoyaltyTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'loyalty_tracking'
    `);

    console.log('Colunas loyalty_points em customers:', checkLoyaltyColumns.rows.length);
    console.log('Colunas de fidelização em service_types:', checkServiceTypeColumns.rows.length);
    console.log('Tabela loyalty_tracking existe:', checkLoyaltyTable.rows.length > 0);

    if (checkLoyaltyColumns.rows.length === 0 || checkServiceTypeColumns.rows.length < 3 || checkLoyaltyTable.rows.length === 0) {
      console.log('Executando migração do sistema de fidelização...');

      // Ler e executar a migração 0005_add_loyalty_system.sql
      const migrationPath = path.join(process.cwd(), 'migrations', '0005_add_loyalty_system.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log('Executando SQL da migração...');
      await pool.query(migrationSQL);

      console.log('Migração do sistema de fidelização executada com sucesso!');
    } else {
      console.log('Sistema de fidelização já está configurado.');
    }

    // Verificar se o usuário admin existe e atualizar se necessário
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin'");

    if (adminCheck.rows.length === 0) {
      console.log('Criando usuário admin...');
      const scryptAsync = promisify(crypto.scrypt);

      const salt = crypto.randomBytes(16).toString("hex");
      const buf = await scryptAsync('admin123', salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      await pool.query(`
        INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['admin', hashedPassword, 'admin@carhub.com', 'Administrador', 'Sistema', 'admin', true, ['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']]);

      console.log('Usuário admin criado com sucesso!');
    } else {
      console.log('Usuário admin já existe.');
    }

    // Verificar estrutura final das tabelas
    console.log('\n=== VERIFICAÇÃO FINAL ===');

    const customersStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      ORDER BY ordinal_position
    `);

    const serviceTypesStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'service_types' 
      ORDER BY ordinal_position
    `);

    const loyaltyTrackingStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_tracking' 
      ORDER BY ordinal_position
    `);

    console.log('\nEstrutura da tabela customers:');
    customersStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\nEstrutura da tabela service_types:');
    serviceTypesStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\nEstrutura da tabela loyalty_tracking:');
    loyaltyTrackingStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Verificar se as tabelas de service extras existem
    const checkServiceExtrasTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('service_extras', 'service_extras_items')
    `);

    console.log('Tabelas de service extras encontradas:', checkServiceExtrasTable.rows.length);

    if (checkServiceExtrasTable.rows.length < 2) {
      console.log('Executando migração de service extras...');
      
      // Ler e executar a migração 0008_add_service_extras.sql
      const serviceExtrasMigrationPath = path.join(process.cwd(), 'migrations', '0008_add_service_extras.sql');
      const serviceExtrasMigrationSQL = fs.readFileSync(serviceExtrasMigrationPath, 'utf8');

      console.log('Executando SQL da migração de service extras...');
      await pool.query(serviceExtrasMigrationSQL);

      console.log('Migração de service extras executada com sucesso!');
    } else {
      console.log('Tabelas de service extras já existem.');
    }

    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await pool.end();
  }
}

runMigration();