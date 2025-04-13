-- Remove foreign key constraints
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_service_id_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_serviceId_fkey";

-- Remove Service model (table)
DROP TABLE IF EXISTS "Service";

-- Ensure Order has service_id column
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "service_id" TEXT;

-- Add index on service_id
CREATE INDEX IF NOT EXISTS "Order_service_id_idx" ON "Order" ("service_id");

-- Update the schema_migrations table to indicate these changes were applied
-- This helps Prisma understand the current state of the database
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    gen_random_uuid(),
    'remove_service_model',
    NOW(),
    'remove_service_model',
    'Manually applied migration to remove Service model and adjust Order table',
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING; 