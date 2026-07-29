/*
  Warnings:

  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."suppliers" DROP CONSTRAINT "suppliers_companyId_fkey";

-- DropTable
DROP TABLE "public"."suppliers";

-- DropEnum
DROP TYPE "public"."SupplierStatus";
