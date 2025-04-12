#!/bin/sh

# Aguardar 2 segundos para garantir que a rede e outros serviços estejam prontos
sleep 2

# Exibir variáveis de ambiente (exceto chaves secretas)
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "HOST: $HOST"

# Iniciar o servidor
echo "Iniciando o servidor..."
node dist/server.js 