FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas e OpenSSL para o Prisma
RUN apk add --no-cache curl postgresql-client openssl openssl-dev libc6-compat

# Verificar a versão do OpenSSL
RUN openssl version

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
# Configurar ambientes para o Prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
# Forçar o uso do target específico
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm uninstall prisma @prisma/client || true
RUN npm install --save-exact prisma@4.8.1 @prisma/client@4.8.1
RUN npm install @apollo/server @graphql-tools/schema graphql

# Criar arquivo .env.railway e .env diretamente
RUN echo "# Configuração do Supabase (site principal)" > .env.railway \
    && echo "SUPABASE_URL=https://ijpwrspomqdnxavpjbzh.supabase.co" >> .env.railway \
    && echo "SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcHdyc3BvbXFkbnhhdnBqYnpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODM0Njc3NiwiZXhwIjoyMDUzOTIyNzc2fQ.9qjf-8uWdN6t1wS5i7BXI1Zp6lv-b0mcxXDaUJXFhTM" >> .env.railway \
    && echo "NODE_ENV=production" >> .env.railway \
    && echo "PORT=4000" >> .env.railway \
    && cp .env.railway .env

# Copiar arquivos Prisma primeiro para gerar o cliente
COPY prisma ./prisma/

# Verificar se o schema.prisma existe e mostrar seu conteúdo
RUN ls -la ./prisma/
RUN cat ./prisma/schema.prisma

# Criar diretório para o output do Prisma Client
RUN mkdir -p node_modules/.prisma/client

# Limpar quaisquer binários existentes para evitar conflitos
RUN rm -rf node_modules/.prisma/client/runtime || true

# Gerar o Prisma Client com target explícito
RUN npx prisma@4.8.1 generate --schema=./prisma/schema.prisma

# Verificar quais binários foram gerados
RUN find node_modules/.prisma -type f -name "*.node" | sort

# Tentar fazer download manual do engine se necessário
RUN if [ ! -f node_modules/.prisma/client/runtime/libquery_engine-linux-musl-openssl-3.0.x.so.node ]; then \
    echo "Binário não encontrado, tentando baixar manualmente..." && \
    mkdir -p /tmp/prisma-engines && \
    PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
    npx prisma@4.8.1 generate --schema=./prisma/schema.prisma; \
    fi

# Copiar diretório source
COPY src ./src/

# Copiar os arquivos de servidor
COPY complete-server.js ./
COPY modified-server.js ./

# Criar o script de inicialização diretamente
RUN echo '#!/bin/sh' > start.sh \
    && echo '' >> start.sh \
    && echo 'echo "=== STARTING VIRALIZAMOS ORDERS SERVICE ==="' >> start.sh \
    && echo '' >> start.sh \
    && echo '# Verificar ambiente' >> start.sh \
    && echo 'echo "📋 Verificando ambiente:"' >> start.sh \
    && echo 'echo "- Diretório atual: $(pwd)"' >> start.sh \
    && echo 'echo "- Arquivos: $(ls -la)"' >> start.sh \
    && echo '' >> start.sh \
    && echo '# Verificar se o servidor completo existe e iniciar' >> start.sh \
    && echo 'if [ -f "./complete-server.js" ]; then' >> start.sh \
    && echo '  echo "🚀 Iniciando servidor completo..."' >> start.sh \
    && echo '  exec node ./complete-server.js' >> start.sh \
    && echo 'else' >> start.sh \
    && echo '  echo "⚠️ Servidor completo não encontrado!"' >> start.sh \
    && echo '  echo "❌ Iniciando servidor de emergência..."' >> start.sh \
    && echo '  exec node -e "const http = require(\"http\"); const PORT = process.env.PORT || 4000; const server = http.createServer((req, res) => { res.writeHead(200, { \"Content-Type\": \"application/json\" }); res.end(JSON.stringify({ status: \"ok\", message: \"Emergency server running\" })); }); server.listen(PORT, () => console.log(\"Server running on port \"+PORT));"' >> start.sh \
    && echo 'fi' >> start.sh

# Garantir que o script tenha permissões de execução
RUN chmod +x ./start.sh && ls -la start.sh

# Verificar a existência e conteúdo do arquivo .env
RUN echo "Verificando arquivo .env:" && ls -la .env* && cat .env | grep -v "KEY\|SECRET\|PASSWORD"

# Copiar o restante dos arquivos
COPY . .

# Garantir novamente que o script tenha permissões de execução
RUN chmod 755 ./start.sh && ls -la start.sh

# Copiar para o local que o contêiner está procurando
RUN cp ./start.sh /app/.start.sh && chmod 755 /app/.start.sh

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Iniciar com nosso script de inicialização (usando o caminho absoluto)
CMD ["sh", "/app/.start.sh"] 