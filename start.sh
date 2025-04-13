#!/bin/bash

echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="

# Verificar ambiente 
echo -e "\n📋 Verificando ambiente:"
echo -e "\n- Diretório atual: $(pwd)"

# Verificar arquivos de configuração
echo -e "\n- Arquivos de configuração:"
if [ -f .env ]; then
  echo "  ✅ Arquivo .env encontrado"
else
  echo "  Nenhum arquivo .env encontrado"
fi

# Verificar variáveis de ambiente do Railway
if [ -n "$RAILWAY_STATIC_URL" ]; then
  echo -e "\n🔍 Verificando variáveis de ambiente do Railway:"
  echo -e "\n  Railway detectado: $RAILWAY_STATIC_URL"
  echo -e "\n  Usando variáveis de ambiente do Railway"
  
  # Mostrar algumas configurações importantes (parcialmente ocultas)
  echo -e "\n🌐 Configurações de ambiente:"
  echo "PORT: ${PORT:-8080}"
  echo "NODE_ENV: ${NODE_ENV:-development}"
  
  # Mostrar variáveis sensíveis parcialmente (apenas primeiros caracteres)
  DB_URL_PARTIAL=$(echo $DATABASE_URL | cut -c1-15)
  echo "DATABASE_URL: ${DB_URL_PARTIAL}... (parcial)"
  
  SUPABASE_URL_PARTIAL=$SUPABASE_URL
  echo "SUPABASE_URL: ${SUPABASE_URL_PARTIAL}"
  
  SUPABASE_KEY_PARTIAL=$(echo $SUPABASE_SERVICE_KEY | cut -c1-10)
  echo "SUPABASE_SERVICE_KEY: ${SUPABASE_KEY_PARTIAL}... (ocultado)"
fi

# Aplicar correções no banco de dados
echo -e "\n🔄 Aplicando correções no banco de dados..."
node prisma-db-fix.js
echo "Script executed successfully."

# Iniciar servidor
echo -e "\n🚀 Iniciando servidor completo..."
node complete-server.js 