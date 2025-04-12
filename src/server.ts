import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schemas';
import { resolvers } from './graphql/resolvers';

// Função para iniciar o servidor
async function startServer() {
  // Criar app Express
  const app = express();
  
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
  
  // Configurar middleware
  app.use(cors());
  app.use(express.json());
  
  // Rota de healthcheck explícita (para Railway)
  app.get('/health', (_, res) => {
    res.status(200).json({ 
      status: 'ok', 
      service: 'viralizamos-orders-graphql',
      timestamp: new Date().toISOString() 
    });
  });
  
  // Aplicar middleware Apollo ao Express
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
}

// Iniciar o servidor e tratar erros
startServer().catch((err) => {
  console.error('Erro ao iniciar o servidor:', err);
}); 