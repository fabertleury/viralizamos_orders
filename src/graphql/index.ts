import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { resolvers } from './resolvers';

// Criar cliente Prisma
const prisma = new PrismaClient();

// Ler o arquivo de schema
const typeDefs = readFileSync(join(__dirname, 'schemas', 'schema.graphql'), 'utf-8');

// Configurar servidor Express
const app = express();
const httpServer = http.createServer(app);

// Criar servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// Função para iniciar o servidor
async function startServer() {
  // Iniciar servidor Apollo
  await server.start();
  
  // Aplicar middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async () => ({ prisma }),
    }),
  );
  
  // Iniciar servidor HTTP
  await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log(`🚀 Servidor GraphQL pronto em http://localhost:4000/graphql`);
}

// Exportar o servidor e o Prisma para testes e outros módulos
export { server, prisma, startServer };

// Iniciar o servidor se este arquivo for executado diretamente
if (require.main === module) {
  startServer().catch((err) => {
    console.error('Erro ao iniciar o servidor:', err);
  });
} 