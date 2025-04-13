/**
 * Script para corrigir o erro de tabelas ausentes no banco de dados
 * Este script verifica e cria as tabelas necessárias definidas no schema.prisma
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

console.log('Iniciando script de correção do banco de dados...');

// Função para verificar se um arquivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    console.error(`Erro ao verificar arquivo ${filePath}:`, err);
    return false;
  }
}

// Verificar ambiente
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);

// Backup do schema atual
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const backupPath = path.join(__dirname, 'prisma', 'schema.prisma.backup');

if (fileExists(schemaPath)) {
  console.log('Fazendo backup do schema.prisma atual...');
  try {
    fs.copyFileSync(schemaPath, backupPath);
    console.log('Backup do schema.prisma criado com sucesso.');
  } catch (err) {
    console.error('Erro ao criar backup do schema:', err);
    process.exit(1);
  }
} else {
  console.error('Arquivo schema.prisma não encontrado!');
  process.exit(1);
}

// Verificar e aplicar migrações
try {
  console.log('Executando comando de migração do Prisma...');
  
  // Verificar se existe o diretório de migrações
  const migrationsPath = path.join(__dirname, 'prisma', 'migrations');
  if (!fileExists(migrationsPath)) {
    console.log('Diretório de migrações não encontrado, criando...');
    fs.mkdirSync(migrationsPath, { recursive: true });
  }
  
  // No ambiente de produção, forçamos a criação das tabelas
  if (isProduction) {
    console.log('Ambiente de produção: aplicando push do schema diretamente...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  } else {
    // Em desenvolvimento, usamos o processo normal de migração
    console.log('Criando migração inicial...');
    execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  }
  
  console.log('Migração concluída com sucesso!');
} catch (err) {
  console.error('Erro ao executar a migração:', err);
  
  // Restaurar backup em caso de erro
  console.log('Restaurando schema.prisma do backup...');
  try {
    fs.copyFileSync(backupPath, schemaPath);
    console.log('Schema restaurado com sucesso.');
  } catch (restoreErr) {
    console.error('Erro ao restaurar schema:', restoreErr);
  }
  
  process.exit(1);
}

// Verificar se a tabela Service existe após a migração
try {
  console.log('Gerando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('Verificando tabela Service...');
  const prisma = new PrismaClient();
  
  async function checkServiceTable() {
    try {
      // Tentar contar os registros na tabela Service
      const count = await prisma.$executeRaw`SELECT COUNT(*) FROM "Service"`;
      console.log('Tabela Service existe e está acessível.');
      
      // Verificar se o serviço 'viralizamos' existe
      const service = await prisma.service.findFirst({
        where: { name: 'viralizamos' }
      });
      
      // Se não existir, criar
      if (!service) {
        await prisma.service.create({
          data: {
            name: 'viralizamos',
            description: 'Serviço principal da Viralizamos',
            type: 'social',
            status: 'active'
          }
        });
        console.log('Serviço "viralizamos" criado com sucesso.');
      } else {
        console.log('Serviço "viralizamos" já existe.');
      }
      
      await prisma.$disconnect();
      console.log('Correção do banco de dados concluída com sucesso!');
    } catch (err) {
      console.error('Erro ao verificar ou criar a tabela Service:', err);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
  
  checkServiceTable();
} catch (err) {
  console.error('Erro ao gerar cliente Prisma ou verificar tabela:', err);
  process.exit(1);
}

// Inicializar cliente Prisma
const prisma = new PrismaClient();

// Função para aplicar correções no banco de dados
async function applyDatabaseCorrections() {
  console.log('Aplicando correções no banco de dados...');
  
  try {
    // Verificar conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Obter a string de conexão do banco de dados
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não está definida');
    }

    // Conectar diretamente ao PostgreSQL
    const pool = new Pool({ connectionString: databaseUrl });
    
    try {
      // Verificar se a coluna 'processed' existe na tabela Order
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Order' 
        AND column_name = 'processed'
      `);
      
      if (columnCheck.rowCount === 0) {
        console.log('Coluna processed não encontrada. Adicionando à tabela Order...');
        
        // Adicionar a coluna processed com valor padrão false
        await pool.query(`
          ALTER TABLE "Order"
          ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false
        `);
        
        console.log('Coluna processed adicionada com sucesso.');
      } else {
        console.log('Coluna processed já existe na tabela Order. Prosseguindo...');
      }
      
      // Remover a constraint de chave estrangeira problemática (se existir)
      try {
        await pool.query(`
          ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_provider_id_fkey"
        `);
        console.log('Constraint de chave estrangeira removida com sucesso (ou já não existia).');
      } catch (constraintError) {
        console.error('Erro ao remover constraint:', constraintError);
      }
      
      // Adicionar a constraint novamente com a opção ON DELETE SET NULL
      try {
        await pool.query(`
          ALTER TABLE "Order" 
          ADD CONSTRAINT "Order_provider_id_fkey" 
          FOREIGN KEY (provider_id) 
          REFERENCES "Provider"(id) 
          ON DELETE SET NULL
        `);
        console.log('Constraint de chave estrangeira adicionada novamente com opção ON DELETE SET NULL.');
      } catch (constraintError) {
        console.error('Erro ao adicionar nova constraint:', constraintError);
      }
      
      console.log('Correções no banco de dados aplicadas com sucesso.');
    } catch (sqlError) {
      console.error('Erro ao executar consultas SQL:', sqlError);
      throw sqlError;
    } finally {
      // Fechar a conexão com o pool PostgreSQL
      await pool.end();
    }
  } catch (error) {
    console.error('Erro ao aplicar correções no banco de dados:', error);
    throw error;
  } finally {
    // Fechar a conexão Prisma
    await prisma.$disconnect();
  }
}

// Executar o script se chamado diretamente
if (require.main === module) {
  applyDatabaseCorrections()
    .then(() => {
      console.log('Script executed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { applyDatabaseCorrections }; 