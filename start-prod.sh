#!/bin/sh
# Script para iniciar o servidor em produção

# Definir variáveis de ambiente
export NODE_ENV=production

# Executar migrações do Prisma (se necessário)
echo "Executando migrações do Prisma..."
npx prisma migrate deploy

# Gerar o cliente Prisma
echo "Gerando cliente Prisma..."
npx prisma generate

# Executar SQL personalizado (remove Service model)
echo "Aplicando correções no banco de dados..."
npx prisma db execute --file ./prisma/remove_service_model.sql --schema ./prisma/schema.prisma

# Iniciar a aplicação
echo "Iniciando o servidor..."
node complete-server.js 