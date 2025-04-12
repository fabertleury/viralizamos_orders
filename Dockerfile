FROM node:18-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules/
COPY . .
RUN npm run build:railway || true

# Copiar o arquivo de healthcheck standalone para a pasta dist
RUN cp src/standalone-health.js dist/ || true

FROM node:18-alpine AS runner

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl busybox-extras procps

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=builder /app/dist ./dist/ || true
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/start.sh ./start.sh

# Tornar o script de inicialização executável
RUN chmod +x ./start.sh

# Verificar se o diretório /app/dist/prisma existe
RUN if [ ! -d "/app/dist/prisma" ]; then \
      mkdir -p /app/dist/prisma; \
    fi

# Copiar o diretório prisma explicitamente
COPY prisma ./prisma/
COPY prisma ./dist/prisma

# Instalar apenas dependências de produção
RUN npm ci --omit=dev

# IMPORTANTE: Gerar o cliente Prisma
RUN npx prisma generate

EXPOSE 4000

# Health check básico
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["./start.sh"] 