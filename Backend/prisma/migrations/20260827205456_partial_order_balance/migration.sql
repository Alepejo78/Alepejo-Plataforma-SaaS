-- AlterEnum
ALTER TYPE "public"."PurchaseOrderStatus" ADD VALUE 'PARTIALLY_CONVERTED';

-- AlterEnum
ALTER TYPE "public"."SalesOrderStatus" ADD VALUE 'PARTIALLY_CONVERTED';

-- DropIndex
DROP INDEX "public"."purchases_purchaseOrderId_key";

-- DropIndex
DROP INDEX "public"."sales_salesOrderId_key";

-- AlterTable
ALTER TABLE "public"."purchase_order_items" ADD COLUMN     "convertedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sales_order_items" ADD COLUMN     "convertedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "purchases_purchaseOrderId_idx" ON "public"."purchases"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "sales_salesOrderId_idx" ON "public"."sales"("salesOrderId");
