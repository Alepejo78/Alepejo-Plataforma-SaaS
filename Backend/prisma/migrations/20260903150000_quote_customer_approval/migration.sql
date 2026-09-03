-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'QUOTE_REVISION_REQUESTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'QUOTE_CANCELLED_BY_CUSTOMER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'QUOTE_APPROVED_BY_CUSTOMER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."QuoteStatus" ADD VALUE 'SENT';
ALTER TYPE "public"."QuoteStatus" ADD VALUE 'REVISION_REQUESTED';

-- AlterTable
ALTER TABLE "public"."quotes" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" VARCHAR(64),
ADD COLUMN     "customerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "customerCancelReason" TEXT,
ADD COLUMN     "customerCancelledAt" TIMESTAMP(3),
ADD COLUMN     "customerRevisionAt" TIMESTAMP(3),
ADD COLUMN     "customerRevisionNote" TEXT,
ADD COLUMN     "installmentInterestAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."sales_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "maxInstallments" INTEGER NOT NULL DEFAULT 12,
    "interestFreeInstallments" INTEGER NOT NULL DEFAULT 3,
    "interestRatePerInstallment" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_settings_companyId_key" ON "public"."sales_settings"("companyId");

-- AddForeignKey
ALTER TABLE "public"."sales_settings" ADD CONSTRAINT "sales_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

