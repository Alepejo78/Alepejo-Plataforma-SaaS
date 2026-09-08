-- AlterTable
ALTER TABLE "public"."financial_entries" ADD COLUMN     "quotationId" TEXT;

-- AlterTable
ALTER TABLE "public"."purchases" ADD COLUMN     "quotationId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
