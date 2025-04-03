-- CreateTable
CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "provider_id" TEXT,
  "external_order_id" TEXT,
  "status" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL,
  "target_username" TEXT NOT NULL,
  "target_url" TEXT,
  "customer_name" TEXT,
  "customer_email" TEXT,
  "provider_response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "metadata" JSONB,
  
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "api_key" TEXT NOT NULL,
  "api_url" TEXT NOT NULL,
  "status" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLog" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "OrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
  "id" TEXT NOT NULL,
  "webhook_type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "error" TEXT,
  
  CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "Order_transaction_id_idx" ON "Order"("transaction_id");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_external_order_id_idx" ON "Order"("external_order_id");

-- CreateIndex
CREATE INDEX "Provider_slug_idx" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "OrderLog_order_id_idx" ON "OrderLog"("order_id");

-- CreateIndex
CREATE INDEX "WebhookLog_webhook_type_idx" ON "WebhookLog"("webhook_type");

-- CreateIndex
CREATE INDEX "WebhookLog_processed_idx" ON "WebhookLog"("processed");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLog" ADD CONSTRAINT "OrderLog_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 