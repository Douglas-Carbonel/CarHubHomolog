import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateExistingServices() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Iniciando migração de serviços existentes...');
    
    // Buscar serviços que têm estimated_value mas não têm service_items
    const servicesWithoutItems = await sql`
      SELECT s.id, s.estimated_value, s.service_type_id
      FROM services s
      LEFT JOIN service_items si ON s.id = si.service_id
      WHERE s.estimated_value IS NOT NULL 
        AND s.estimated_value != '0.00'
        AND si.service_id IS NULL
      ORDER BY s.id
    `;
    
    console.log(`Encontrados ${servicesWithoutItems.length} serviços para migrar`);
    
    for (const service of servicesWithoutItems) {
      console.log(`Migrando serviço ID ${service.id} com valor ${service.estimated_value}`);
      
      // Determinar o service_type_id
      let serviceTypeId = service.service_type_id;
      
      // Se não tem service_type_id, usar "Outros" (ID 10) como padrão
      if (!serviceTypeId) {
        serviceTypeId = 10; // ID do tipo "Outros"
      }
      
      // Criar um service_item para este serviço
      await sql`
        INSERT INTO service_items (
          service_id,
          service_type_id,
          quantity,
          unit_price,
          total_price,
          notes,
          created_at,
          updated_at
        ) VALUES (
          ${service.id},
          ${serviceTypeId},
          1,
          ${service.estimated_value},
          ${service.estimated_value},
          'Migrado automaticamente',
          NOW(),
          NOW()
        )
      `;
      
      console.log(`✓ Service_item criado para serviço ${service.id}`);
    }
    
    console.log('Migração concluída com sucesso!');
    
    // Verificar os resultados
    const verification = await sql`
      SELECT 
        COUNT(*) as total_services,
        COUNT(si.service_id) as services_with_items
      FROM services s
      LEFT JOIN service_items si ON s.id = si.service_id
      WHERE s.estimated_value IS NOT NULL 
        AND s.estimated_value != '0.00'
    `;
    
    console.log('Verificação:', verification[0]);
    
  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  }
}

// Executar se chamado diretamente
migrateExistingServices()
  .then(() => {
    console.log('Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro no script:', error);
    process.exit(1);
  });

export { migrateExistingServices };