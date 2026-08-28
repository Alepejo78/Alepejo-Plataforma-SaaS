-- AlterTable
ALTER TABLE "public"."purchase_order_items" ADD COLUMN     "discardedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sales_order_items" ADD COLUMN     "discardedQuantity" DECIMAL(18,3) NOT NULL DEFAULT 0;
