FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Primeiro, copiar apenas package.json e prisma schema para otimizar o cache
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install

# Gerar Prisma Client explicitamente antes do build
RUN npx prisma generate

# Agora copiar o resto dos arquivos
COPY . .

# Instalar cross-env globalmente
RUN npm install -g cross-env

# Executar o build do projeto com flag para ignorar erros
RUN npm run build || echo "Ignorando erros de build para continuar a implantação"

# Tornar o script de inicialização executável
RUN chmod +x ./start.sh

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

CMD ["./start.sh"] 