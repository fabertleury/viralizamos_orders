"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const schema_1 = require("@graphql-tools/schema");
const schemas_1 = require("./graphql/schemas");
const resolvers_1 = require("./graphql/resolvers");
// Função para iniciar o servidor
async function startServer() {
    // Criar app Express
    const app = (0, express_1.default)();
    // Criar HTTP server
    const httpServer = http_1.default.createServer(app);
    // Criar schema executável combinando typeDefs e resolvers
    const schema = (0, schema_1.makeExecutableSchema)({
        typeDefs: schemas_1.typeDefs,
        resolvers: resolvers_1.resolvers,
    });
    // Criar servidor Apollo
    const server = new server_1.ApolloServer({
        schema,
        plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
    });
    // Iniciar o servidor Apollo
    await server.start();
    // Configurar middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Rota de saúde
    app.get('/health', (_, res) => {
        res.status(200).send({ status: 'ok', service: 'viralizamos-orders-graphql' });
    });
    // Aplicar middleware Apollo ao Express
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
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
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
    console.log(`🚀 Servidor GraphQL rodando em http://localhost:${PORT}/graphql`);
}
// Iniciar o servidor e tratar erros
startServer().catch((err) => {
    console.error('Erro ao iniciar o servidor:', err);
});
