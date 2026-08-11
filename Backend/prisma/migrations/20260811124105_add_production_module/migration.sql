-- CreateEnum
CREATE TYPE "public"."ProductionOrderStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProductionOrderOrigin" AS ENUM ('MANUAL', 'SALES_ORDER', 'LOW_STOCK');

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "minProductionBatch" DECIMAL(18,3);

-- CreateTable
CREATE TABLE "public"."production_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "origin" "public"."ProductionOrderOrigin" NOT NULL DEFAULT 'MANUAL',
    "salesOrderId" TEXT,
    "status" "public"."ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "observation" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "minBatchSize" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "autoGenerateOnSalesOrder" BOOLEAN NOT NULL DEFAULT true,
    "autoGenerateOnLowStock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_orders_companyId_idx" ON "public"."production_orders"("companyId");

-- CreateIndex
CREATE INDEX "production_orders_productId_idx" ON "public"."production_orders"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_companyId_number_key" ON "public"."production_orders"("companyId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "production_settings_companyId_key" ON "public"."production_settings"("companyId");

-- AddForeignKey
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "production_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "production_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "production_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "production_orders_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "public"."sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_settings" ADD CONSTRAINT "production_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
