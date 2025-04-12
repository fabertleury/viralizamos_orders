import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schemas';
import { resolvers } from './graphql/resolvers';

// Criar app Express
const app = express();

// Configurar middleware básico
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(process.cwd(), 'public')));

// Rotas de healthcheck com alta prioridade
app.get('/health', (_, res) => {
  console.log('Health check acessado');
  res.status(200).json({ 
    status: 'ok', 
    service: 'viralizamos-orders-graphql',
    timestamp: new Date().toISOString() 
  });
});

app.get('/', (_, res) => {
  console.log('Rota raiz acessada');
  res.status(200).json({ 
    status: 'ok', 
    service: 'viralizamos-orders-graphql',
    timestamp: new Date().toISOString() 
  });
});

// Função para iniciar o servidor Apollo
async function startApolloServer() {
  try {
    // Criar HTTP server
    const httpServer = http.createServer(app);
    
    // Criar schema executável combinando typeDefs e resolvers
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });
    
    // Criar servidor Apollo
    const server = new ApolloServer({
      schema,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });
    
    // Iniciar o servidor Apollo
    await server.start();
    console.log('🚀 Servidor GraphQL iniciado com sucesso');
    
    // Aplicar middleware Apollo ao Express para a rota /graphql
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => {
        // Aqui você pode adicionar autenticação e autorização
        const token = req.headers.authorization || '';
        
        // Retornar o contexto para os resolvers
        return {
          token,
        };
      },
    }));
    
    // Iniciar o servidor HTTP
    const PORT = process.env.PORT || 4000;
    const HOST = process.env.HOST || '0.0.0.0';
    await new Promise<void>((resolve) => httpServer.listen({ port: PORT, host: HOST }, resolve));
    
    console.log(`🚀 Servidor GraphQL rodando em http://${HOST}:${PORT}/graphql`);
    console.log(`📊 Healthcheck disponível em http://${HOST}:${PORT}/health`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor Apollo:', err);
  }
}

// Iniciar o servidor HTTP imediatamente
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🌐 Servidor Express iniciado em http://${HOST}:${PORT}`);
  
  // Iniciar o Apollo Server de forma assíncrona
  startApolloServer().catch(err => {
    console.error('Falha ao iniciar o Apollo Server:', err);
  });
}); 