FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas e OpenSSL para o Prisma
RUN apk add --no-cache curl postgresql-client openssl openssl-dev libc6-compat

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
# Adicionar mirror de binários do Prisma para ajudar no download
ENV PRISMA_BINARIES_MIRROR=https://prisma-builds.s3-eu-west-1.amazonaws.com

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar arquivos Prisma primeiro para gerar o cliente
COPY prisma ./prisma/

# Criar diretório para o output do Prisma Client
RUN mkdir -p node_modules/.prisma/client

# Gerar o Prisma Client simplificado (usando configurações do schema.prisma)
RUN echo "Gerando cliente Prisma, isso pode levar alguns minutos..."
RUN npx prisma generate

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