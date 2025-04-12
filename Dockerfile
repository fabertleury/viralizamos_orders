FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas e OpenSSL para o Prisma
RUN apk add --no-cache curl postgresql-client openssl openssl-dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar arquivos Prisma primeiro para gerar o cliente
COPY prisma ./prisma/

# Criar diretório para o output do Prisma Client
RUN mkdir -p node_modules/.prisma/client

# Gerar o Prisma Client com flags específicos para garantir a compilação correta
RUN npx prisma generate --generator-provider=prisma-client-js --binary-targets=native,linux-musl

# Verificar se os binários foram gerados corretamente
RUN ls -la node_modules/.prisma/client

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