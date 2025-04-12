const http = require('http');
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// Configurações
const PORT = process.env.PORT || 4000;

// Criar aplicação Express
const app = express();
app.use(express.json());

// Definir tipo DateTime escalar
const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Definir schema GraphQL mínimo
const typeDefs = gql`
  scalar DateTime
  
  type Query {
    ping: String
    health: HealthCheck
  }
  
  type HealthCheck {
    status: String!
    timestamp: DateTime!
    service: String!
  }
`;

// Definir resolvers
const resolvers = {
  DateTime: dateTimeScalar,
  Query: {
    ping: () => 'pong',
    health: () => ({
      status: 'ok',
      timestamp: new Date(),
      service: 'viralizamos-orders-fallback'
    }),
  },
};

// Rota de healthcheck
app.get('/health', (_, res) => {
  console.log('Health check acessado');
  res.status(200).json({ 
    status: 'ok', 
    service: 'viralizamos-orders-fallback',
    timestamp: new Date().toISOString() 
  });
});

// Rota para criar ordens
app.post('/api/orders/create', (req, res) => {
  try {
    console.log('Dados recebidos na rota /api/orders/create:', JSON.stringify(req.body));
    
    // Responder com sucesso fictício
    res.status(200).json({
      success: true,
      order_id: 'fallback-' + Date.now(),
      message: 'Ordem criada pelo servidor de contingência'
    });
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar pedido'
    });
  }
});

// Configurar Apollo Server
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    context: ({ req }) => ({
      token: req.headers.authorization || '',
    }),
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  // Iniciar servidor HTTP
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor fallback rodando em http://0.0.0.0:${PORT}`);
    console.log(`📊 GraphQL disponível em http://0.0.0.0:${PORT}${server.graphqlPath}`);
    console.log('⚠️ Este é um servidor de contingência com funcionalidade ampliada');
    console.log('⚠️ Endpoints disponíveis: /health, /api/orders/create, /graphql');
  });
}

startServer().catch(error => {
  console.error('❌ Erro ao iniciar servidor Apollo:', error);
}); 