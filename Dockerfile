FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl postgresql-client

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar arquivos essenciais
COPY complete-server.js ./
COPY prisma ./prisma/

# Tentar gerar o Prisma Client
RUN npx prisma generate || echo "Ignorando erro de geração do Prisma Client"

# Copiar o restante dos arquivos
COPY . .

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Iniciar o servidor completo diretamente
CMD ["node", "complete-server.js"] 