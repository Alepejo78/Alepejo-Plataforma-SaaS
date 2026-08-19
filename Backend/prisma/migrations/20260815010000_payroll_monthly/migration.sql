-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollItemStatus" AS ENUM ('PENDING', 'INCLUDED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "PayrollLineType" AS ENUM ('PROVENTO', 'DESCONTO');

-- CreateTable
CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "competenceYear" INTEGER NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentDate" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "totalGross" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalEmployerFgts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PayrollItemStatus" NOT NULL DEFAULT 'PENDING',
    "baseSalary" DECIMAL(18,2) NOT NULL,
    "salaryType" "SalaryType" NOT NULL,
    "dependentsCount" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "expectedMinutes" INTEGER NOT NULL DEFAULT 0,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "extraAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unjustifiedAbsenceDays" INTEGER NOT NULL DEFAULT 0,
    "absenceDeductionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transportVoucherDeduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherEarnings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerFgtsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_item_lines" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "type" "PayrollLineType" NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "referenceValue" VARCHAR(50),
    "amount" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "payroll_item_lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN "payrollItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_companyId_competenceYear_competenceMonth_key" ON "payrolls"("companyId", "competenceYear", "competenceMonth");

-- CreateIndex
CREATE INDEX "payrolls_companyId_idx" ON "payrolls"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_payrollId_employeeId_key" ON "payroll_items"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "payroll_items_employeeId_idx" ON "payroll_items"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_item_lines_payrollItemId_idx" ON "payroll_item_lines"("payrollItemId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_payrollItemId_key" ON "financial_entries"("payrollItemId");

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_item_lines" ADD CONSTRAINT "payroll_item_lines_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "payroll_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "payroll_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
