-- Adicionar coluna external_service_id na tabela Order
ALTER TABLE "Order" ADD COLUMN "external_service_id" TEXT;

-- Criar índice para a nova coluna
CREATE INDEX "Order_external_service_id_idx" ON "Order"("external_service_id");

-- Atualizar comentário para registro
COMMENT ON COLUMN "Order"."external_service_id" IS 'ID do serviço no sistema do provedor - IMPORTANTE para envio ao provedor'; 