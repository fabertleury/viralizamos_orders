-- Script para renomear tabelas para corresponder à case sensitivity do Prisma

-- Primeiro verificamos se as tabelas existem com outros nomes
DO $$
DECLARE
   social_exists INTEGER;
   provider_exists INTEGER;
   category_exists INTEGER;
   subcategory_exists INTEGER;
   service_exists INTEGER;
   order_exists INTEGER;
   orderlog_exists INTEGER;
   user_exists INTEGER;
   webhooklog_exists INTEGER;
BEGIN
   -- Verificar cada tabela
   SELECT COUNT(*) INTO social_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'social';
   
   SELECT COUNT(*) INTO provider_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'provider';
   
   SELECT COUNT(*) INTO category_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'category';
   
   SELECT COUNT(*) INTO subcategory_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'subcategory';
   
   SELECT COUNT(*) INTO service_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'service';
   
   SELECT COUNT(*) INTO order_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'order';
   
   SELECT COUNT(*) INTO orderlog_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'orderlog';
   
   SELECT COUNT(*) INTO user_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'user';
   
   SELECT COUNT(*) INTO webhooklog_exists FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'webhooklog';

   -- Renomear tabelas se existirem
   IF social_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela social para Social';
      EXECUTE 'ALTER TABLE IF EXISTS "social" RENAME TO "Social"';
   END IF;
   
   IF provider_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela provider para Provider';
      EXECUTE 'ALTER TABLE IF EXISTS "provider" RENAME TO "Provider"';
   END IF;
   
   IF category_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela category para Category';
      EXECUTE 'ALTER TABLE IF EXISTS "category" RENAME TO "Category"';
   END IF;
   
   IF subcategory_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela subcategory para Subcategory';
      EXECUTE 'ALTER TABLE IF EXISTS "subcategory" RENAME TO "Subcategory"';
   END IF;
   
   IF service_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela service para Service';
      EXECUTE 'ALTER TABLE IF EXISTS "service" RENAME TO "Service"';
   END IF;
   
   IF order_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela order para Order';
      -- "order" é uma palavra reservada no PostgreSQL, necessita de aspas duplas
      EXECUTE 'ALTER TABLE IF EXISTS "order" RENAME TO "Order"';
   END IF;
   
   IF orderlog_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela orderlog para OrderLog';
      EXECUTE 'ALTER TABLE IF EXISTS "orderlog" RENAME TO "OrderLog"';
   END IF;
   
   IF user_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela user para User';
      -- "user" é uma palavra reservada no PostgreSQL, necessita de aspas duplas
      EXECUTE 'ALTER TABLE IF EXISTS "user" RENAME TO "User"';
   END IF;
   
   IF webhooklog_exists > 0 THEN
      RAISE NOTICE 'Renomeando tabela webhooklog para WebhookLog';
      EXECUTE 'ALTER TABLE IF EXISTS "webhooklog" RENAME TO "WebhookLog"';
   END IF;
END $$;

-- Verificar se as tabelas foram renomeadas corretamente
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name; 