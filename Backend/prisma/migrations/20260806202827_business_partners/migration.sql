/*
  Warnings:

  - You are about to drop the column `supplierId` on the `purchases` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partnerId` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partnerId` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BusinessPartnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."BusinessPartnerRole" AS ENUM ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'SALES_REP');

-- CreateEnum
CREATE TYPE "public"."PersonType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- DropForeignKey
ALTER TABLE "public"."clients" DROP CONSTRAINT "clients_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."purchases" DROP CONSTRAINT "purchases_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sales" DROP CONSTRAINT "sales_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."suppliers" DROP CONSTRAINT "suppliers_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."purchases" DROP COLUMN "supplierId",
ADD COLUMN     "partnerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."sales" DROP COLUMN "clientId",
ADD COLUMN     "partnerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."clients";

-- DropTable
DROP TABLE "public"."suppliers";

-- DropEnum
DROP TYPE "public"."ClientStatus";

-- DropEnum
DROP TYPE "public"."SupplierStatus";

-- CreateTable
CREATE TABLE "public"."business_partners" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roles" "public"."BusinessPartnerRole"[],
    "personType" "public"."PersonType" NOT NULL DEFAULT 'COMPANY',
    "legalName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(200),
    "document" VARCHAR(20) NOT NULL,
    "stateRegistration" VARCHAR(30),
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "contactName" VARCHAR(150),
    "zipCode" VARCHAR(15),
    "street" VARCHAR(150),
    "number" VARCHAR(20),
    "complement" VARCHAR(100),
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "notes" TEXT,
    "status" "public"."BusinessPartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "business_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_partners_companyId_idx" ON "public"."business_partners"("companyId");

-- CreateIndex
CREATE INDEX "business_partners_legalName_idx" ON "public"."business_partners"("legalName");

-- CreateIndex
CREATE INDEX "business_partners_document_idx" ON "public"."business_partners"("document");

-- CreateIndex
CREATE INDEX "business_partners_status_idx" ON "public"."business_partners"("status");

-- CreateIndex
CREATE UNIQUE INDEX "business_partners_companyId_document_key" ON "public"."business_partners"("companyId", "document");

-- AddForeignKey
ALTER TABLE "public"."business_partners" ADD CONSTRAINT "business_partners_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
