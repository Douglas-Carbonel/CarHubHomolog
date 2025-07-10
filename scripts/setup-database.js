
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://postgres.loegpeghzieljlsrjbvi:Dy4hvAawS1m6WIm4@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
});

async function setupDatabase() {
  try {
    console.log('🔍 Verificando conexão com o banco Supabase...');
    
    // Testar conexão
    const testConnection = await pool.query('SELECT NOW()');
    console.log('✅ Conexão com Supabase estabelecida:', testConnection.rows[0].now);
    
    // Verificar se as tabelas existem
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'customers', 'vehicles', 'services', 'service_types', 'payments', 'sessions')
    `);
    
    const existingTables = tablesCheck.rows.map(row => row.table_name);
    console.log('📋 Tabelas existentes:', existingTables);
    
    // Criar tabela de sessões (obrigatória para Replit Auth)
    if (!existingTables.includes('sessions')) {
      console.log('🔧 Criando tabela sessions...');
      await pool.query(`
        CREATE TABLE sessions (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        );
        CREATE INDEX IDX_session_expire ON sessions (expire);
      `);
    }
    
    // Criar tabela de usuários com sistema de permissões
    if (!existingTables.includes('users')) {
      console.log('🔧 Criando tabela users...');
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(20) DEFAULT 'technician',
          is_active BOOLEAN DEFAULT true,
          permissions TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Inserir usuário admin padrão
      console.log('👤 Criando usuário administrador...');
      await pool.query(`
        INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
        VALUES (
          'admin', 
          '$2b$10$8K1p/a0dclsgI22L/h5F9.cWx8Zm7H5bK5Pw/1wKIxtVMRg1KK1g2', 
          'admin@carhub.com', 
          'Administrador', 
          'Sistema', 
          'admin', 
          true, 
          ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
        )
        ON CONFLICT (username) DO UPDATE SET
          permissions = ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports'],
          role = 'admin',
          first_name = 'Administrador',
          last_name = 'Sistema';
      `);
    } else {
      // Verificar se a tabela users tem as colunas de permissões
      const userColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('first_name', 'last_name', 'role', 'is_active', 'permissions')
      `);
      
      const existingColumns = userColumns.rows.map(row => row.column_name);
      console.log('🔍 Colunas existentes na tabela users:', existingColumns);
      
      // Adicionar colunas faltantes
      if (!existingColumns.includes('first_name')) {
        await pool.query('ALTER TABLE users ADD COLUMN first_name VARCHAR(100)');
      }
      if (!existingColumns.includes('last_name')) {
        await pool.query('ALTER TABLE users ADD COLUMN last_name VARCHAR(100)');
      }
      if (!existingColumns.includes('role')) {
        await pool.query('ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT \'technician\'');
      }
      if (!existingColumns.includes('is_active')) {
        await pool.query('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true');
      }
      if (!existingColumns.includes('permissions')) {
        await pool.query('ALTER TABLE users ADD COLUMN permissions TEXT[] DEFAULT \'{}\'');
      }
    }
    
    // Criar tabela de clientes
    if (!existingTables.includes('customers')) {
      console.log('🔧 Criando tabela customers...');
      await pool.query(`
        CREATE TABLE customers (
          id SERIAL PRIMARY KEY,
          code VARCHAR UNIQUE NOT NULL,
          document VARCHAR UNIQUE NOT NULL,
          document_type VARCHAR CHECK (document_type IN ('cpf', 'cnpj')) NOT NULL,
          name VARCHAR NOT NULL,
          phone VARCHAR,
          email VARCHAR,
          address TEXT,
          observations TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    // Criar tabela de veículos
    if (!existingTables.includes('vehicles')) {
      console.log('🔧 Criando tabela vehicles...');
      await pool.query(`
        CREATE TABLE vehicles (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id) NOT NULL,
          plate VARCHAR UNIQUE NOT NULL,
          brand VARCHAR NOT NULL,
          model VARCHAR NOT NULL,
          year INTEGER NOT NULL,
          color VARCHAR,
          observations TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    // Criar tabela de tipos de serviço
    if (!existingTables.includes('service_types')) {
      console.log('🔧 Criando tabela service_types...');
      await pool.query(`
        CREATE TABLE service_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR NOT NULL,
          description TEXT,
          default_price DECIMAL(10, 2),
          estimated_duration INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    // Criar tabela de serviços
    if (!existingTables.includes('services')) {
      console.log('🔧 Criando tabela services...');
      await pool.query(`
        CREATE TABLE services (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id) NOT NULL,
          vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
          service_type_id INTEGER REFERENCES service_types(id) NOT NULL,
          technician_id INTEGER REFERENCES users(id),
          status VARCHAR CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
          scheduled_date DATE,
          scheduled_time TIME,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          estimated_value DECIMAL(10, 2),
          final_value DECIMAL(10, 2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    // Criar tabela de pagamentos
    if (!existingTables.includes('payments')) {
      console.log('🔧 Criando tabela payments...');
      await pool.query(`
        CREATE TABLE payments (
          id SERIAL PRIMARY KEY,
          service_id INTEGER REFERENCES services(id) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          method VARCHAR CHECK (method IN ('cash', 'card', 'pix', 'transfer')) NOT NULL,
          paid_at TIMESTAMP DEFAULT NOW(),
          notes TEXT
        );
      `);
    }
    
    // Verificar se usuário admin existe
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      console.log('👤 Criando usuário administrador...');
      await pool.query(`
        INSERT INTO users (username, password, email, first_name, last_name, role, is_active, permissions)
        VALUES (
          'admin', 
          '$2b$10$8K1p/a0dclsgI22L/h5F9.cWx8Zm7H5bK5Pw/1wKIxtVMRg1KK1g2', 
          'admin@carhub.com', 
          'Administrador', 
          'Sistema', 
          'admin', 
          true, 
          ARRAY['admin', 'customers', 'vehicles', 'services', 'schedule', 'reports']
        );
      `);
    }
    
    // Inserir tipos de serviço padrão
    const serviceTypesCheck = await pool.query("SELECT COUNT(*) FROM service_types");
    if (serviceTypesCheck.rows[0].count === '0') {
      console.log('🔧 Inserindo tipos de serviço padrão...');
      await pool.query(`
        INSERT INTO service_types (name, description, default_price, estimated_duration) VALUES
        ('Troca de Óleo', 'Troca de óleo do motor', 150.00, 60),
        ('Alinhamento', 'Alinhamento de rodas', 80.00, 45),
        ('Balanceamento', 'Balanceamento de rodas', 60.00, 30),
        ('Revisão Geral', 'Revisão completa do veículo', 300.00, 180),
        ('Troca de Pastilhas', 'Troca de pastilhas de freio', 200.00, 90);
      `);
    }
    
    console.log('✅ Configuração do banco de dados concluída!');
    console.log('🔐 Usuário admin criado: admin / admin123');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();
