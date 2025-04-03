const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo .env
const envPath = path.join(__dirname, '.env');

// Verificar se o arquivo .env existe
if (!fs.existsSync(envPath)) {
  console.error('Arquivo .env não encontrado. Por favor, crie um arquivo .env com DATABASE_URL.');
  process.exit(1);
}

// Ler o arquivo .env
const envContent = fs.readFileSync(envPath, 'utf8');

// Extrair DATABASE_URL do arquivo .env
const match = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error('DATABASE_URL não encontrada no arquivo .env.');
  process.exit(1);
}

const databaseUrl = match[1];
console.log('Database URL encontrada.');

try {
  // Criar diretório de migrações se não existir
  const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Verificar se o arquivo de migração existe
  const migrationFile = path.join(migrationsDir, 'migration.sql');
  if (!fs.existsSync(migrationFile)) {
    console.error('Arquivo migration.sql não encontrado.');
    process.exit(1);
  }

  // Ler o conteúdo do arquivo de migração
  const migrationSql = fs.readFileSync(migrationFile, 'utf8');
  console.log('Arquivo de migração encontrado.');

  // Executar a migração usando o cliente pg do Prisma
  console.log('Executando migração...');
  execSync(`npx prisma db execute --file ./prisma/migrations/migration.sql`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit'
  });

  console.log('Migração executada com sucesso!');

  console.log('Gerando cliente Prisma...');
  execSync('npx prisma generate', {
    stdio: 'inherit'
  });

  console.log('Cliente Prisma gerado com sucesso!');
} catch (error) {
  console.error('Erro ao executar migração:', error.message);
  process.exit(1);
} 