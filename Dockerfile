FROM node:18-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Verificar se o diretório /app/dist/prisma existe
RUN if [ ! -d "/app/dist/prisma" ]; then \
      mkdir -p /app/dist/prisma; \
    fi

# Copiar o diretório prisma explicitamente
COPY prisma ./prisma
COPY prisma ./dist/prisma

EXPOSE 4000

CMD ["node", "dist/server.js"] 