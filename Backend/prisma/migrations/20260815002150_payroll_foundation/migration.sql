-- CreateEnum
CREATE TYPE "public"."PayrollTaxType" AS ENUM ('INSS', 'IRRF');

-- AlterTable: financial_entries — partnerId vira opcional, ganha employeeId alternativo
ALTER TABLE "public"."financial_entries" ALTER COLUMN "partnerId" DROP NOT NULL;
ALTER TABLE "public"."financial_entries" ADD COLUMN     "employeeId" TEXT;

-- AlterTable: benefits — flag de Vale Transporte
ALTER TABLE "public"."benefits" ADD COLUMN     "isTransportVoucher" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: employee_dependents — elegibilidade pra dedução de IRRF
ALTER TABLE "public"."employee_dependents" ADD COLUMN     "irrfEligible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."payroll_tax_tables" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "fgtsPercentage" DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    "dependentDeductionValue" DECIMAL(18,2) NOT NULL,
    "irrfReliefThreshold" DECIMAL(18,2),
    "irrfReliefPhaseOutEnd" DECIMAL(18,2),
    "irrfReliefBase" DECIMAL(18,6),
    "irrfReliefFactor" DECIMAL(10,6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_tax_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payroll_tax_brackets" (
    "id" TEXT NOT NULL,
    "payrollTaxTableId" TEXT NOT NULL,
    "taxType" "public"."PayrollTaxType" NOT NULL,
    "order" INTEGER NOT NULL,
    "minBase" DECIMAL(18,2) NOT NULL,
    "maxBase" DECIMAL(18,2),
    "rate" DECIMAL(5,2) NOT NULL,
    "deduction" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "payroll_tax_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payroll_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "extraHourSurchargePercentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "transportVoucherPercentage" DECIMAL(5,2) NOT NULL DEFAULT 6.00,
    "thirteenthDefaultInstallments" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entries_employeeId_idx" ON "public"."financial_entries"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_tax_tables_companyId_idx" ON "public"."payroll_tax_tables"("companyId");

-- CreateIndex
CREATE INDEX "payroll_tax_brackets_payrollTaxTableId_taxType_idx" ON "public"."payroll_tax_brackets"("payrollTaxTableId", "taxType");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_settings_companyId_key" ON "public"."payroll_settings"("companyId");

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_tax_tables" ADD CONSTRAINT "payroll_tax_tables_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_tax_brackets" ADD CONSTRAINT "payroll_tax_brackets_payrollTaxTableId_fkey" FOREIGN KEY ("payrollTaxTableId") REFERENCES "public"."payroll_tax_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payroll_settings" ADD CONSTRAINT "payroll_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: garante que o título aponta pra um parceiro OU um colaborador, nunca os dois nem nenhum
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_partner_or_employee_check" CHECK (
  ("partnerId" IS NOT NULL AND "employeeId" IS NULL) OR
  ("partnerId" IS NULL AND "employeeId" IS NOT NULL)
);
