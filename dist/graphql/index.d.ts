import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const server: ApolloServer<import("@apollo/server").BaseContext>;
declare function startServer(): Promise<void>;
export { server, prisma, startServer };
