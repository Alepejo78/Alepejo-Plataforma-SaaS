-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "invoiceIssueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceKey" VARCHAR(50);
