# Viralizamos Orders Service

Serviço GraphQL para gerenciamento de pedidos e integração com provedores.

## Configuração de Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Compilar o projeto
npm run build
```

## Deploy no Railway

Este projeto está configurado para deploy no Railway com as seguintes configurações:

1. Um script personalizado `build:railway` que ignora erros de TypeScript durante o build
2. Configuração do Nixpacks em `nixpacks.toml`
3. Configuração do Railway em `railway.json`

### Configuração do Build

Para o Railway, usamos:

```bash
npm run build:railway
```

Este comando compila o TypeScript mesmo na presença de erros.

### Variáveis de Ambiente

As seguintes variáveis de ambiente precisam ser configuradas no Railway:

- `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
- `REDIS_URL`: URL de conexão com o Redis (para filas)
- `JWT_SECRET`: Chave secreta para autenticação JWT
- `PORT`: Porta para executar o servidor (padrão: 4000)

## Estrutura do Projeto

- `/prisma`: Schema do banco de dados e migrações
- `/src/graphql`: Definições GraphQL (schemas e resolvers)
- `/src/app`: Rotas da API
- `/src/lib`: Utilitários e lógica de negócio 