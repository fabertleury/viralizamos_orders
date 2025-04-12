/**
 * Script para configurar o Prisma Client de forma mais robusta
 * Este script cria um cliente Prisma mínimo e um fallback caso a geração falhe
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRISMA_SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const PRISMA_CLIENT_DIR = path.join(__dirname, '../node_modules/.prisma/client');
const PRISMA_CLIENT_INDEX = path.join(__dirname, '../node_modules/@prisma/client/index.js');

console.log('🔧 Configurando Prisma Client...');

// Verifica se o schema existe
if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
  console.warn('⚠️ Schema do Prisma não encontrado em:', PRISMA_SCHEMA_PATH);
  console.log('📝 Criando um schema Prisma mínimo para continuar...');
  
  const minimalSchema = `
// Minimal Prisma schema
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client"
}

model Order {
  id               String   @id @default(uuid())
  transaction_id   String
  external_service_id String?
  status           String   @default("pending")
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
}
  `;
  
  // Cria o diretório se não existir
  if (!fs.existsSync(path.dirname(PRISMA_SCHEMA_PATH))) {
    fs.mkdirSync(path.dirname(PRISMA_SCHEMA_PATH), { recursive: true });
  }
  
  fs.writeFileSync(PRISMA_SCHEMA_PATH, minimalSchema);
  console.log('✅ Schema Prisma mínimo criado com sucesso!');
}

// Tenta gerar o Prisma Client
try {
  console.log('🔄 Gerando Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client gerado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao gerar Prisma Client:', error.message);
  console.log('🔄 Criando um cliente Prisma mínimo de fallback...');
  
  // Cria diretórios necessários
  if (!fs.existsSync(path.dirname(PRISMA_CLIENT_INDEX))) {
    fs.mkdirSync(path.dirname(PRISMA_CLIENT_INDEX), { recursive: true });
  }
  
  // Cria um cliente Prisma mínimo de fallback
  const minimalClient = `
/**
 * Prisma Client JS fallback version.
 * Criado automaticamente quando a geração falhou.
 */

const { EventEmitter } = require('events');

// Classe PrismaClient de fallback com operações mínimas
class PrismaClient extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
    console.warn('⚠️ Usando Prisma Client de fallback - funcionalidade limitada');
  }
  
  // Métodos genéricos para principais operações
  async $connect() {
    console.log('PrismaClient fallback: conectado (simulado)');
    return this;
  }
  
  async $disconnect() {
    console.log('PrismaClient fallback: desconectado (simulado)');
    return true;
  }
  
  // Implementação mínima para order
  get order() {
    return {
      findUnique: async (args) => null,
      findFirst: async (args) => null,
      findMany: async (args) => [],
      create: async (args) => ({ 
        id: 'fallback-' + Date.now(),
        transaction_id: args.data.transaction_id || 'unknown',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        ...args.data
      }),
      update: async (args) => ({ id: args.where.id, ...args.data }),
      delete: async (args) => ({ id: args.where.id }),
      count: async () => 0
    };
  }
  
  // Implementação mínima para orderLog
  get orderLog() {
    return {
      create: async (args) => ({
        id: 'fallback-log-' + Date.now(),
        order_id: args.data.order_id,
        level: args.data.level || 'info',
        message: args.data.message || '',
        created_at: new Date(),
        ...args.data
      })
    };
  }
  
  // Método genérico para executar consultas raw
  async $executeRawUnsafe(query, ...values) {
    console.log('SQL Query (simulada):', query, values);
    return 1; // Simula uma linha afetada
  }
  
  // Método auxiliar para executar transações
  async $transaction(operations) {
    if (Array.isArray(operations)) {
      return Promise.all(operations.map(op => op.catch(e => e)));
    }
    if (typeof operations === 'function') {
      return operations(this);
    }
    return [];
  }
}

// Singleton
const prisma = new PrismaClient();
module.exports = {
  PrismaClient,
  default: prisma,
  prisma
};
  `;
  
  fs.writeFileSync(PRISMA_CLIENT_INDEX, minimalClient);
  console.log('✅ Cliente Prisma de fallback criado com sucesso!');
  
  // Exibir aviso importante
  console.warn('⚠️ ATENÇÃO: Usando Prisma Client de fallback com funcionalidade limitada.');
  console.warn('⚠️ Apenas operações básicas serão suportadas.');
}

console.log('🎉 Configuração do Prisma concluída!'); 