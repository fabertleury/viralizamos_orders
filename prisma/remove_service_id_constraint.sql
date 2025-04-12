-- Script para remover a restrição de chave estrangeira service_id na tabela Order
-- Executar este script diretamente no banco de dados do Railway

-- Remover a restrição de chave estrangeira
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";

-- Adicionar ordem fallback para o serviço que está causando o erro
INSERT INTO "Service" (id, name, description, type, status)
VALUES 
('691a9dfa-0ea2-41a4-bd5f-6104b80365e0', 'Serviço Instagram (Import)', 'Serviço importado do Supabase', 'instagram', 'active')
ON CONFLICT (id) DO NOTHING;

-- Criar um índice que ajuda na performance de buscas
CREATE INDEX IF NOT EXISTS "idx_order_transaction_id" ON "Order" (transaction_id);
CREATE INDEX IF NOT EXISTS "idx_order_service_id" ON "Order" (service_id); 