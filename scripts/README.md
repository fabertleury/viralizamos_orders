# Instruções para Atualização do Banco de Dados

## Problema

Foi identificado um problema onde a coluna `external_service_id` está definida no schema do Prisma, mas não foi criada no banco de dados. Isso está causando erros quando o sistema tenta acessar essa coluna.

Erro específico:
```
Invalid `s.order.findUnique()` invocation:
The column `Order.external_service_id` does not exist in the current database.
```

## Solução

Para resolver este problema, criamos um script que adiciona a coluna `external_service_id` na tabela `Order` do banco de dados.

## Como aplicar a correção

### 1. Método recomendado: Usando o script automatizado

Execute o script de migração que criamos:

```bash
node scripts/apply-migration.js
```

Este script:
1. Conecta ao banco de dados usando as credenciais do arquivo `.env`
2. Aplica a migração para adicionar a coluna `external_service_id`
3. Verifica se a coluna foi adicionada com sucesso

### 2. Método alternativo: Aplicar manualmente via SQL

Se preferir aplicar manualmente, execute os seguintes comandos SQL no banco de dados:

```sql
-- Adicionar coluna external_service_id na tabela Order
ALTER TABLE "Order" ADD COLUMN "external_service_id" TEXT;

-- Criar índice para a nova coluna
CREATE INDEX "Order_external_service_id_idx" ON "Order"("external_service_id");
```

### 3. Método via Prisma (ambiente de desenvolvimento)

Em ambiente de desenvolvimento, você também pode usar o Prisma para gerar e aplicar a migração:

```bash
npx prisma migrate dev --name add_external_service_id
```

## Verificação

Após aplicar a migração, verifique se o erro foi resolvido:

1. Reinicie o serviço de orders
2. Verifique os logs para confirmar que o erro não ocorre mais
3. Teste a funcionalidade de criação de novos pedidos 