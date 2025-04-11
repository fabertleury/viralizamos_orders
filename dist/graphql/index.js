"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.server = void 0;
exports.startServer = startServer;
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = require("fs");
const path_1 = require("path");
const client_1 = require("@prisma/client");
const resolvers_1 = require("./resolvers");
// Criar cliente Prisma
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
// Ler o arquivo de schema
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'schemas', 'schema.graphql'), 'utf-8');
// Configurar servidor Express
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
// Criar servidor Apollo
const server = new server_1.ApolloServer({
    typeDefs,
    resolvers: resolvers_1.resolvers,
    plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
});
exports.server = server;
// Função para iniciar o servidor
async function startServer() {
    // Iniciar servidor Apollo
    await server.start();
    // Aplicar middleware
    app.use('/graphql', (0, cors_1.default)(), body_parser_1.default.json(), (0, express4_1.expressMiddleware)(server, {
        context: async () => ({ prisma }),
    }));
    // Iniciar servidor HTTP
    await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
    console.log(`🚀 Servidor GraphQL pronto em http://localhost:4000/graphql`);
}
// Iniciar o servidor se este arquivo for executado diretamente
if (require.main === module) {
    startServer().catch((err) => {
        console.error('Erro ao iniciar o servidor:', err);
    });
}
