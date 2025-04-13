/**
 * Script para corrigir o erro de tabelas ausentes no banco de dados
 * Este script verifica e cria as tabelas necessárias definidas no schema.prisma
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  const { PrismaClient } = require('@prisma/client');
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