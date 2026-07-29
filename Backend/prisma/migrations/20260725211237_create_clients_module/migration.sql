-- CreateEnum
CREATE TYPE "public"."ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document" VARCHAR(20) NOT NULL,
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
    "status" "public"."ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "public"."clients"("companyId");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "public"."clients"("name");

-- CreateIndex
CREATE INDEX "clients_document_idx" ON "public"."clients"("document");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "public"."clients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyId_document_key" ON "public"."clients"("companyId", "document");

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
