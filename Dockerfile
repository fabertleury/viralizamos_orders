FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas e OpenSSL para o Prisma (garantindo versão 3.0.x)
RUN apk add --no-cache curl postgresql-client openssl openssl-dev libc6-compat

# Verificar a versão do OpenSSL
RUN openssl version

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
# Configurar ambientes para o Prisma
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências com versão específica do Prisma
RUN npm uninstall prisma @prisma/client || true
RUN npm install --save-exact prisma@4.8.1 @prisma/client@4.8.1

# Copiar arquivos Prisma primeiro para gerar o cliente
COPY prisma ./prisma/

# Verificar se o schema.prisma existe e mostrar seu conteúdo
RUN ls -la ./prisma/
RUN cat ./prisma/schema.prisma

# Criar diretório para o output do Prisma Client
RUN mkdir -p node_modules/.prisma/client

# Limpar quaisquer binários existentes para evitar conflitos
RUN rm -rf node_modules/.prisma/client/runtime || true

# Gerar o Prisma Client 
RUN npx prisma@4.8.1 generate

# Verificar quais binários foram gerados
RUN find node_modules/.prisma/client/runtime -name "*.node" || true

# Copiar o servidor completo
COPY complete-server.js ./

# Copiar o restante dos arquivos
COPY . .

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Iniciar o servidor completo diretamente
CMD ["node", "complete-server.js"] 