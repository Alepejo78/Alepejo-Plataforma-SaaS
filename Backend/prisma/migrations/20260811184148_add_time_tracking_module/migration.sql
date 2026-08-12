-- CreateEnum
CREATE TYPE "public"."TimeEntrySource" AS ENUM ('MANUAL', 'API', 'BARCODE', 'QRCODE');

-- CreateEnum
CREATE TYPE "public"."AbsenceType" AS ENUM ('FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'ABONO');

-- CreateEnum
CREATE TYPE "public"."AbsenceStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "timeClockApiKeyCreatedAt" TIMESTAMP(3),
ADD COLUMN     "timeClockApiKeyHash" VARCHAR(255),
ADD COLUMN     "timeClockApiKeyPrefix" VARCHAR(12);

-- CreateTable
CREATE TABLE "public"."time_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" "public"."TimeEntrySource" NOT NULL DEFAULT 'MANUAL',
    "observation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_sheet_approvals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workedMinutes" INTEGER NOT NULL,
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_sheet_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."absence_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."AbsenceType" NOT NULL,
    "reason" VARCHAR(500),
    "status" "public"."AbsenceStatus" NOT NULL DEFAULT 'PENDENTE',
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entries_companyId_idx" ON "public"."time_entries"("companyId");

-- CreateIndex
CREATE INDEX "time_entries_employeeId_timestamp_idx" ON "public"."time_entries"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "time_sheet_approvals_companyId_idx" ON "public"."time_sheet_approvals"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "time_sheet_approvals_companyId_employeeId_date_key" ON "public"."time_sheet_approvals"("companyId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "absence_records_companyId_idx" ON "public"."absence_records"("companyId");

-- CreateIndex
CREATE INDEX "absence_records_employeeId_date_idx" ON "public"."absence_records"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entries" ADD CONSTRAINT "time_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_sheet_approvals" ADD CONSTRAINT "time_sheet_approvals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_sheet_approvals" ADD CONSTRAINT "time_sheet_approvals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."absence_records" ADD CONSTRAINT "absence_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."absence_records" ADD CONSTRAINT "absence_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
