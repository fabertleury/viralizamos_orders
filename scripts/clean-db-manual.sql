-- Remover a restrição de chave estrangeira service_id na tabela Order
ALTER TABLE IF EXISTS "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";

-- Remover a coluna service_id da tabela Order
ALTER TABLE IF EXISTS "Order" DROP COLUMN IF EXISTS "service_id";

-- Remover as tabelas desnecessárias
DROP TABLE IF EXISTS "Service" CASCADE;
DROP TABLE IF EXISTS "Social" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Subcategory" CASCADE;

-- Validar que as tabelas foram removidas com sucesso
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 