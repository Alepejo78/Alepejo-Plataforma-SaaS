-- CreateEnum
CREATE TYPE "public"."InventoryCountStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."inventory_counts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "public"."InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "countDate" TIMESTAMP(3),
    "observation" VARCHAR(500) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_count_items" (
    "id" TEXT NOT NULL,
    "inventoryCountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" DECIMAL(18,3) NOT NULL,
    "countedQuantity" DECIMAL(18,3),

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_counts_companyId_idx" ON "public"."inventory_counts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_counts_companyId_number_key" ON "public"."inventory_counts"("companyId", "number");

-- CreateIndex
CREATE INDEX "inventory_count_items_inventoryCountId_idx" ON "public"."inventory_count_items"("inventoryCountId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_count_items_inventoryCountId_productId_key" ON "public"."inventory_count_items"("inventoryCountId", "productId");

-- AddForeignKey
ALTER TABLE "public"."inventory_counts" ADD CONSTRAINT "inventory_counts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_counts" ADD CONSTRAINT "inventory_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "public"."inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_count_items" ADD CONSTRAINT "inventory_count_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
