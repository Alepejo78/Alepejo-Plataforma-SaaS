-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "discountValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "freightValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" VARCHAR(50),
ADD COLUMN     "invoicedAt" TIMESTAMP(3),
ADD COLUMN     "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherExpenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingCode" VARCHAR(100);
