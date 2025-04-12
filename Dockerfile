FROM node:18-alpine

WORKDIR /app

# Instalar ferramentas básicas para debug e monitoramento
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copiar apenas os arquivos necessários
COPY package.json ./
COPY start.sh ./

# Instalar cross-env globalmente
RUN npm install -g cross-env

# Tornar o script de inicialização executável
RUN chmod +x ./start.sh

# Criar diretórios necessários
RUN mkdir -p dist
RUN mkdir -p public

# Criar um arquivo de servidor mínimo
RUN echo 'const http = require("http"); \
  const server = http.createServer((req, res) => { \
    if (req.url === "/health" || req.url === "/api/health") { \
      res.writeHead(200, { "Content-Type": "application/json" }); \
      res.end(JSON.stringify({ status: "ok", service: "viralizamos-orders", timestamp: new Date().toISOString() })); \
    } else { \
      res.writeHead(200, { "Content-Type": "application/json" }); \
      res.end(JSON.stringify({ message: "Viralizamos Orders API (Modo de contingência)", version: "1.0.0" })); \
    } \
  }); \
  server.listen(process.env.PORT || 4000, "0.0.0.0", () => { \
    console.log(`Servidor de emergência rodando na porta ${process.env.PORT || 4000}`); \
  });' > dist/server.js

EXPOSE 4000

# Health check básico
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["./start.sh"] 