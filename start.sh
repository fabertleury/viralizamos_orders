#!/bin/sh

# Aguardar 5 segundos para garantir que a rede e outros serviços estejam prontos
sleep 5

# Exibir variáveis de ambiente (exceto chaves secretas)
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "HOST: $HOST"

# Criar um arquivo de healthcheck temporário na raiz
mkdir -p /app/public
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

# Iniciar o servidor
echo "Iniciando o servidor..."
node dist/server.js 