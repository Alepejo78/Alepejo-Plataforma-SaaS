-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "hourBankEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hourBankClosingDate" TIMESTAMP(3),
ADD COLUMN     "hourBankSettledUntil" TIMESTAMP(3);
