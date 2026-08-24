-- DropForeignKey
ALTER TABLE "public"."financial_entries" DROP CONSTRAINT "financial_entries_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."financial_entries" DROP CONSTRAINT "financial_entries_partnerId_fkey";

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "chartOfAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
