-- CreateEnum
CREATE TYPE "VacationPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "vacation_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "concessiveDeadline" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 30,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "soldDays" INTEGER NOT NULL DEFAULT 0,
    "status" "VacationPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_grants" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vacationPeriodId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "soldDays" INTEGER NOT NULL DEFAULT 0,
    "endDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "baseSalary" DECIMAL(18,2) NOT NULL,
    "vacationAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "constitutionalThirdAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "soldAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "soldThirdAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherEarnings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerFgtsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_grant_lines" (
    "id" TEXT NOT NULL,
    "vacationGrantId" TEXT NOT NULL,
    "type" "PayrollLineType" NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "referenceValue" VARCHAR(50),
    "amount" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "vacation_grant_lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN "vacationGrantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vacation_periods_employeeId_startDate_key" ON "vacation_periods"("employeeId", "startDate");

-- CreateIndex
CREATE INDEX "vacation_periods_companyId_idx" ON "vacation_periods"("companyId");

-- CreateIndex
CREATE INDEX "vacation_periods_employeeId_idx" ON "vacation_periods"("employeeId");

-- CreateIndex
CREATE INDEX "vacation_grants_companyId_idx" ON "vacation_grants"("companyId");

-- CreateIndex
CREATE INDEX "vacation_grants_employeeId_idx" ON "vacation_grants"("employeeId");

-- CreateIndex
CREATE INDEX "vacation_grant_lines_vacationGrantId_idx" ON "vacation_grant_lines"("vacationGrantId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_vacationGrantId_key" ON "financial_entries"("vacationGrantId");

-- AddForeignKey
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_grants" ADD CONSTRAINT "vacation_grants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_grants" ADD CONSTRAINT "vacation_grants_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_grants" ADD CONSTRAINT "vacation_grants_vacationPeriodId_fkey" FOREIGN KEY ("vacationPeriodId") REFERENCES "vacation_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_grant_lines" ADD CONSTRAINT "vacation_grant_lines_vacationGrantId_fkey" FOREIGN KEY ("vacationGrantId") REFERENCES "vacation_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_vacationGrantId_fkey" FOREIGN KEY ("vacationGrantId") REFERENCES "vacation_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
