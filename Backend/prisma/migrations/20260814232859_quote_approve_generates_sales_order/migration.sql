-- AlterEnum
ALTER TYPE "public"."QuoteStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "public"."sales_orders" ADD COLUMN     "quoteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_quoteId_key" ON "public"."sales_orders"("quoteId");

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
