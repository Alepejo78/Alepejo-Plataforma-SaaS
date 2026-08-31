-- AlterEnum
ALTER TYPE "public"."ProductionOrderOrigin" ADD VALUE 'SALE';

-- AlterTable
ALTER TABLE "public"."production_orders" ADD COLUMN     "saleId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."production_orders" ADD CONSTRAINT "production_orders_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
