-- AlterTable
ALTER TABLE "modules" ADD COLUMN "monthlyPrice" DECIMAL(18,2);
ALTER TABLE "modules" ADD COLUMN "yearlyPrice" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "plans" ADD COLUMN "setupFee" DECIMAL(18,2);
ALTER TABLE "plans" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN "highlighted" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "CompanyPlanStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "company_plans" ADD COLUMN "status" "CompanyPlanStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "company_plans" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "company_plans" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "company_plans" ADD COLUMN "graceUntil" TIMESTAMP(3);
ALTER TABLE "company_plans" ADD COLUMN "asaasCustomerId" VARCHAR(50);
ALTER TABLE "company_plans" ADD COLUMN "asaasSubscriptionId" VARCHAR(50);

-- CreateIndex
CREATE INDEX "company_plans_status_idx" ON "company_plans"("status");

-- CreateEnum
CREATE TYPE "BillingChargeType" AS ENUM ('SUBSCRIPTION', 'SETUP_FEE', 'ADDON');

-- CreateEnum
CREATE TYPE "BillingChargeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "billing_charges" (
    "id" TEXT NOT NULL,
    "companyPlanId" TEXT NOT NULL,
    "asaasPaymentId" VARCHAR(50),
    "type" "BillingChargeType" NOT NULL,
    "billingType" VARCHAR(20),
    "value" DECIMAL(18,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillingChargeStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" VARCHAR(255),
    "bankSlipUrl" VARCHAR(255),
    "pixPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" TEXT NOT NULL,
    "asaasEventId" VARCHAR(100) NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_charges_asaasPaymentId_key" ON "billing_charges"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "billing_charges_companyPlanId_idx" ON "billing_charges"("companyPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_asaasEventId_key" ON "billing_webhook_events"("asaasEventId");

-- AddForeignKey
ALTER TABLE "billing_charges" ADD CONSTRAINT "billing_charges_companyPlanId_fkey" FOREIGN KEY ("companyPlanId") REFERENCES "company_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
