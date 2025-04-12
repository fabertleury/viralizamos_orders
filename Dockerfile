FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar apenas o servidor básico e o script de inicialização
COPY basic-server.js ./
COPY package.json ./

# Criar pasta public para healthcheck
RUN mkdir -p public
RUN mkdir -p dist

# Criar arquivo estático para healthcheck
RUN echo '{"status":"ok","service":"viralizamos-orders-basic"}' > ./public/health.json

# Criar link para o servidor básico na pasta dist para compatibilidade
RUN echo 'require("../basic-server.js");' > ./dist/server.js

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Iniciar o servidor HTTP básico diretamente
CMD ["node", "basic-server.js"] 