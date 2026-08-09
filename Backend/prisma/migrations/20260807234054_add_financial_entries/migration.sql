-- CreateEnum
CREATE TYPE "public"."FinancialEntryType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "public"."FinancialEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."FinancialDocumentType" AS ENUM ('BOLETO', 'CARNE', 'CUPOM_FISCAL', 'NOTA_FISCAL', 'RECIBO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'TRANSFERENCIA', 'DEPOSITO', 'DEBITO', 'CREDITO', 'CHEQUE', 'DESCONTO_NF', 'OUTRO');

-- CreateTable
CREATE TABLE "public"."financial_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "public"."FinancialEntryType" NOT NULL,
    "status" "public"."FinancialEntryStatus" NOT NULL DEFAULT 'OPEN',
    "partnerId" TEXT NOT NULL,
    "chartOfAccountId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "termDays" INTEGER,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "documentNumber" VARCHAR(50),
    "documentType" "public"."FinancialDocumentType",
    "amount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" "public"."PaymentMethod",
    "observation" TEXT,
    "purchaseId" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entries_companyId_idx" ON "public"."financial_entries"("companyId");

-- CreateIndex
CREATE INDEX "financial_entries_partnerId_idx" ON "public"."financial_entries"("partnerId");

-- CreateIndex
CREATE INDEX "financial_entries_type_status_idx" ON "public"."financial_entries"("type", "status");

-- CreateIndex
CREATE INDEX "financial_entries_dueDate_idx" ON "public"."financial_entries"("dueDate");

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
