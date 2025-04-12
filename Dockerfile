FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar todos os arquivos do projeto
COPY . .

# Instalar dependências
RUN npm install

# Instalar cross-env globalmente
RUN npm install -g cross-env

# Executar o build do projeto
RUN npm run build

# Tornar o script de inicialização executável
RUN chmod +x ./start.sh

# Health check básico
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

CMD ["./start.sh"] 