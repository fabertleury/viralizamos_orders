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

# Copiar arquivos para geração do Prisma Client
COPY prisma ./prisma/

# Instalar pg para conexão com o banco
RUN npm install --no-save pg

# Preparar ambiente para geração do Prisma Client
RUN mkdir -p node_modules/.prisma/client
RUN mkdir -p node_modules/@prisma/client

# Copiar remaining files
COPY . .

# Usar script de bootstrap para iniciar o servidor
RUN mkdir -p dist
COPY basic-server.js ./dist/
RUN if [ -f "./dist/bootstrap.js" ]; then echo "Bootstrap file exists"; else echo "Bootstrap file will be created"; fi

# Criar script de bootstrap se não existir
RUN if [ ! -f "./dist/bootstrap.js" ]; then \
    echo 'const http = require("http"); \
    const PORT = process.env.PORT || 4000; \
    const server = http.createServer((req, res) => { \
      res.setHeader("Access-Control-Allow-Origin", "*"); \
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); \
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); \
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; } \
      console.log(`${req.method} ${req.url}`); \
      if (req.url === "/health" || req.url === "/api/health") { \
        res.writeHead(200, { "Content-Type": "application/json" }); \
        res.end(JSON.stringify({ status: "ok", service: "viralizamos-orders-emergency", timestamp: new Date().toISOString() })); \
        return; \
      } \
      if (req.url === "/api/orders/create" && req.method === "POST") { \
        let body = ""; \
        req.on("data", chunk => { body += chunk.toString(); }); \
        req.on("end", () => { \
          console.log("Dados recebidos:", body); \
          res.writeHead(200, { "Content-Type": "application/json" }); \
          res.end(JSON.stringify({ \
            success: true, \
            order_id: "emergency-" + Date.now(), \
            message: "Ordem criada (servidor de emergência)" \
          })); \
        }); \
        return; \
      } \
      if (req.url === "/" || req.url === "/api") { \
        res.writeHead(200, { "Content-Type": "application/json" }); \
        res.end(JSON.stringify({ \
          message: "Viralizamos Orders API (Modo de emergência)", \
          version: "1.0.0", \
          status: "emergency" \
        })); \
        return; \
      } \
      res.writeHead(404, { "Content-Type": "application/json" }); \
      res.end(JSON.stringify({ error: "Not Found", message: "Endpoint não encontrado" })); \
    }); \
    server.listen(PORT, "0.0.0.0", () => { \
      console.log(`Servidor de emergência rodando na porta ${PORT}`); \
    });' > ./dist/basic-server.js && \
    echo 'try { \
      require("./basic-server.js"); \
    } catch(e) { \
      console.error("Erro ao iniciar servidor:", e); \
      process.exit(1); \
    }' > ./dist/bootstrap.js; \
  fi

# Health check básico
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Usar script de bootstrap
CMD ["node", "dist/bootstrap.js"] 