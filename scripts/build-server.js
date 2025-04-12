#!/usr/bin/env node

/**
 * Script para construir o servidor para produção
 * Foca apenas nos componentes essenciais: server GraphQL, resolver de orders e Prisma
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Iniciando build personalizado para Railway');

// Executar o TypeScript compiler
try {
  console.log('📦 Compilando TypeScript...');
  execSync('tsc --skipLibCheck --noEmitOnError false', { stdio: 'inherit' });
  console.log('✅ Compilação TypeScript concluída');
} catch (error) {
  console.error('❌ Erro na compilação TypeScript:', error);
  process.exit(1);
}

// Verificar se arquivos importantes existem após a compilação
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ Diretório dist não encontrado após compilação');
  process.exit(1);
}

// Copiar arquivos estáticos necessários (Prisma, etc)
try {
  console.log('📂 Copiando arquivos estáticos...');
  
  // Verificar e copiar schema do Prisma
  const prismaDir = path.join(distDir, 'prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }
  
  // Copiar schema.prisma se existir
  const srcPrismaSchema = path.join(__dirname, '../prisma/schema.prisma');
  const destPrismaSchema = path.join(prismaDir, 'schema.prisma');
  if (fs.existsSync(srcPrismaSchema)) {
    fs.copyFileSync(srcPrismaSchema, destPrismaSchema);
    console.log('✅ schema.prisma copiado');
  }
  
  // Copiar env file para o build
  const envFile = path.join(__dirname, '../.env');
  const destEnvFile = path.join(distDir, '.env');
  if (fs.existsSync(envFile)) {
    fs.copyFileSync(envFile, destEnvFile);
    console.log('✅ .env copiado');
  }
  
  console.log('✅ Arquivos estáticos copiados com sucesso');
} catch (error) {
  console.error('❌ Erro ao copiar arquivos estáticos:', error);
  process.exit(1);
}

console.log('🎉 Build para Railway concluído com sucesso!'); 