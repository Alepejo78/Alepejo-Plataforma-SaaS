-- CreateEnum
CREATE TYPE "public"."SurchargeType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."EntryChargeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."FinancialEntryStatus" ADD VALUE 'AWAITING_CONFIRMATION';

-- AlterTable
ALTER TABLE "public"."business_partners" ADD COLUMN     "asaasCustomerId" VARCHAR(50);

-- CreateTable
CREATE TABLE "public"."payment_method_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "asaasApiKeyEncrypted" TEXT,
    "asaasSandbox" BOOLEAN NOT NULL DEFAULT true,
    "asaasWebhookToken" TEXT,
    "defaultBankAccountId" TEXT,
    "boletoSurchargeType" "public"."SurchargeType",
    "boletoSurchargeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "transferSurchargeType" "public"."SurchargeType",
    "transferSurchargeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pixSurchargeType" "public"."SurchargeType",
    "pixSurchargeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cardSurchargeType" "public"."SurchargeType",
    "cardSurchargeValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cardMaxInstallments" INTEGER NOT NULL DEFAULT 12,
    "cardInterestFreeInstallments" INTEGER NOT NULL DEFAULT 1,
    "cardInterestRatePerInstallment" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entry_charges" (
    "id" TEXT NOT NULL,
    "financialEntryId" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "billingType" TEXT NOT NULL,
    "status" "public"."EntryChargeStatus" NOT NULL DEFAULT 'PENDING',
    "amountCharged" DECIMAL(18,2) NOT NULL,
    "invoiceUrl" VARCHAR(255),
    "bankSlipUrl" VARCHAR(255),
    "pixPayload" TEXT,
    "pixQrCodeImage" TEXT,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entry_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entry_charge_webhook_events" (
    "id" TEXT NOT NULL,
    "asaasEventId" VARCHAR(100) NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_charge_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_settings_companyId_key" ON "public"."payment_method_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "entry_charges_financialEntryId_key" ON "public"."entry_charges"("financialEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "entry_charges_asaasPaymentId_key" ON "public"."entry_charges"("asaasPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "entry_charge_webhook_events_asaasEventId_key" ON "public"."entry_charge_webhook_events"("asaasEventId");

-- AddForeignKey
ALTER TABLE "public"."payment_method_settings" ADD CONSTRAINT "payment_method_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_method_settings" ADD CONSTRAINT "payment_method_settings_defaultBankAccountId_fkey" FOREIGN KEY ("defaultBankAccountId") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entry_charges" ADD CONSTRAINT "entry_charges_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "public"."financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."time_entry_monthly_confirmations_companyId_employeeId_year_key" RENAME TO "time_entry_monthly_confirmations_companyId_employeeId_year__key";
