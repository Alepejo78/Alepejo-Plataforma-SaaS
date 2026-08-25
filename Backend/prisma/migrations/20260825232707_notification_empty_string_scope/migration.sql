/*
  Warnings:

  - Made the column `companyId` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rootCompanyId` on table `notifications` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."notifications" ALTER COLUMN "companyId" SET NOT NULL,
ALTER COLUMN "companyId" SET DEFAULT '',
ALTER COLUMN "rootCompanyId" SET NOT NULL,
ALTER COLUMN "rootCompanyId" SET DEFAULT '';
