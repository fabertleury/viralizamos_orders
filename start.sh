#!/bin/sh

echo "=== INICIALIZANDO SERVIÇO ==="
echo "Diretório atual: $(pwd)"
echo "Conteúdo do diretório: $(ls -la)"

# Verificar se dist/server.js existe
if [ ! -f "dist/server.js" ]; then
  echo "ERRO: O arquivo dist/server.js não foi encontrado!"
  echo "Conteúdo da pasta dist: $(ls -la dist 2>/dev/null || echo 'Pasta dist não encontrada')"
  exit 1
fi

# Criar diretório público para arquivos estáticos
mkdir -p /app/public
echo "Diretório público criado em: /app/public"

# Criar arquivo HTML para verificação de saúde
cat > /app/public/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <title>Service Status</title>
</head>
<body>
  <h1>Service OK</h1>
  <p>Timestamp: $(date)</p>
</body>
</html>
EOF
echo "Arquivo index.html criado"

# Exibir variáveis de ambiente (exceto chaves secretas)
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "HOST: $HOST"

# Forçar a variável PORT se não estiver definida
if [ -z "$PORT" ]; then
  PORT=4000
  echo "Definindo PORT para o valor padrão: $PORT"
fi

# Usar node diretamente, pois é o que funciona melhor no Railway
echo "=== INICIANDO SERVIDOR ==="
echo "node dist/server.js"
exec node dist/server.js 