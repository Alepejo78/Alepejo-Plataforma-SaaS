-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "saleChartOfAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_saleChartOfAccountId_fkey" FOREIGN KEY ("saleChartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
