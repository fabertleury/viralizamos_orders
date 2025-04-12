FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl postgresql-client

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar servidor básico e script de inicialização primeiro (partes essenciais)
COPY basic-server.js /app/
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Copiar arquivos necessários para instalar dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto dos arquivos
COPY . .

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Usar o script de inicialização
CMD ["./start.sh"] 