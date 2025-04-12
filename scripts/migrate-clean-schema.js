// Script para migrar o banco de dados para um esquema simplificado
// Removendo tabelas desnecessárias e modificando relações

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function migrateToCleanSchema() {
  try {
    console.log('🚀 Iniciando migração para o esquema simplificado');
    console.log('=================================================\n');

    // 1. Backup do schema.prisma original
    console.log('1️⃣ Fazendo backup do schema.prisma atual...');
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const backupPath = path.join(process.cwd(), 'prisma', 'schema.prisma.backup');
    
    fs.copyFileSync(schemaPath, backupPath);
    console.log(`✅ Backup criado em: ${backupPath}\n`);

    // 2. Verificar e backup de todas as ordens que possuem service_id
    console.log('2️⃣ Verificando pedidos que possuem service_id...');
    const ordersWithServiceId = await prisma.order.findMany({
      where: {
        service_id: { not: null }
      },
      select: {
        id: true,
        service_id: true,
        metadata: true
      }
    });

    if (ordersWithServiceId.length > 0) {
      console.log(`Encontrados ${ordersWithServiceId.length} pedidos com service_id`);
      console.log('Fazendo backup dos dados e atualizando os metadados...');

      // Para cada pedido, atualizar os metadados para incluir o service_id
      for (const order of ordersWithServiceId) {
        // Obter informações do serviço se disponível
        let serviceName = 'Desconhecido';
        try {
          const service = await prisma.service.findUnique({
            where: { id: order.service_id },
            select: { name: true, external_id: true }
          });
          
          if (service) {
            serviceName = service.name;
          }
        } catch (error) {
          console.log(`Erro ao buscar serviço ${order.service_id}: ${error.message}`);
        }

        // Atualizar os metadados do pedido para incluir o service_id
        const existingMetadata = order.metadata || {};
        const updatedMetadata = {
          ...existingMetadata,
          service_id_old: order.service_id,
          service_name: serviceName
        };

        await prisma.order.update({
          where: { id: order.id },
          data: {
            metadata: updatedMetadata
          }
        });
      }

      console.log('✅ Metadados dos pedidos atualizados\n');
    } else {
      console.log('✅ Não há pedidos com service_id para atualizar\n');
    }

    // 3. Modificar as relações na tabela Order
    console.log('3️⃣ Atualizando a tabela Order para remover a relação com Service...');
    
    try {
      // Primeiro remover a restrição de chave estrangeira
      await prisma.$executeRawUnsafe(`
        ALTER TABLE IF EXISTS "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";
        ALTER TABLE IF EXISTS "Order" DROP COLUMN IF EXISTS "service_id";
      `);
      console.log('✅ Relação com Service removida da tabela Order\n');
    } catch (error) {
      console.error('❌ Erro ao remover relação:', error);
    }

    // 4. Remover tabelas desnecessárias
    console.log('4️⃣ Removendo tabelas desnecessárias...');
    
    const tablesToRemove = [
      'Service',
      'Social',
      'Category',
      'Subcategory'
    ];

    for (const table of tablesToRemove) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Tabela ${table} removida`);
      } catch (error) {
        console.error(`❌ Erro ao remover tabela ${table}:`, error);
      }
    }

    console.log('\n✅ Tabelas desnecessárias removidas\n');

    // 5. Substituir o schema.prisma com a versão simplificada
    console.log('5️⃣ Substituindo schema.prisma pelo modelo simplificado...');
    
    const newSchemaPath = path.join(process.cwd(), 'prisma', 'schema-clean.prisma');
    
    if (fs.existsSync(newSchemaPath)) {
      const newSchemaContent = fs.readFileSync(newSchemaPath, 'utf8');
      fs.writeFileSync(schemaPath, newSchemaContent);
      console.log('✅ schema.prisma atualizado com o modelo simplificado\n');
    } else {
      console.error('❌ Arquivo schema-clean.prisma não encontrado\n');
      throw new Error('Arquivo schema-clean.prisma não encontrado');
    }

    // 6. Regenerar o cliente Prisma
    console.log('6️⃣ Regenerando o cliente Prisma...');
    
    exec('npx prisma generate', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Erro ao regenerar cliente Prisma: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Prisma stderr: ${stderr}`);
        return;
      }
      
      console.log('✅ Cliente Prisma regenerado com sucesso\n');
      console.log('🎉 Migração para o esquema simplificado concluída!');
      console.log('==================================================');
      console.log(`
Resumo das alterações:
1. Backup do schema.prisma original criado
2. Atualizado metadados de pedidos que possuíam service_id
3. Removido o campo service_id da tabela Order
4. Removidas tabelas desnecessárias: Service, Social, Category, Subcategory
5. Substituído schema.prisma por uma versão simplificada
6. Regenerado o cliente Prisma

Para restaurar o banco de dados ao estado anterior:
1. Copie o arquivo de backup: prisma/schema.prisma.backup para prisma/schema.prisma
2. Execute: npx prisma db push
3. Execute: npx prisma generate
      `);
    });

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a migração
migrateToCleanSchema(); 