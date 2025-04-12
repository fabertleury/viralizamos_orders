-- Script para remover a restrição de chave estrangeira service_id na tabela Order
-- Execute cada comando individualmente para evitar erros com prepared statements

-- Remover a restrição de chave estrangeira
ALTER TABLE IF EXISTS "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";

-- Inserir o serviço faltante na tabela Service
INSERT INTO "Service" (id, name, type, status, created_at, updated_at)
VALUES ('691a9dfa-0ea2-41a4-bd5f-6104b80365e0', 'Serviço Instagram (Import)', 'instagram', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Adicionar o serviço para outros IDs comuns também
INSERT INTO "Service" (id, name, type, status, created_at, updated_at)
VALUES ('89cd99e0-83af-43f6-816e-67d68158d482', 'Serviço Instagram (Likes)', 'instagram', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Criar um índice que ajuda na performance de buscas
CREATE INDEX IF NOT EXISTS "idx_order_transaction_id" ON "Order" (transaction_id);
CREATE INDEX IF NOT EXISTS "idx_order_service_id" ON "Order" (service_id); 