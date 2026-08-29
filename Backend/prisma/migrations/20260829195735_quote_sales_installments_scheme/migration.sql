-- AlterTable
ALTER TABLE "public"."quotes" ADD COLUMN     "chartOfAccountId" TEXT,
ADD COLUMN     "installmentsCount" INTEGER DEFAULT 1,
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "plannedInstallments" JSONB,
ADD COLUMN     "termDays" INTEGER;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "plannedInstallments" JSONB;

-- AlterTable
ALTER TABLE "public"."sales_orders" ADD COLUMN     "plannedInstallments" JSONB;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
