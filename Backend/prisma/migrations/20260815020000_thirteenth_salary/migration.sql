-- CreateTable
CREATE TABLE "thirteenth_salaries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "installment" INTEGER NOT NULL,
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

    CONSTRAINT "thirteenth_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thirteenth_salary_items" (
    "id" TEXT NOT NULL,
    "thirteenthSalaryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PayrollItemStatus" NOT NULL DEFAULT 'PENDING',
    "baseSalary" DECIMAL(18,2) NOT NULL,
    "monthsWorked" INTEGER NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "previousInstallmentAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherEarnings" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inssAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfBase" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "irrfAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "employerFgtsAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thirteenth_salary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thirteenth_salary_item_lines" (
    "id" TEXT NOT NULL,
    "thirteenthSalaryItemId" TEXT NOT NULL,
    "type" "PayrollLineType" NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "referenceValue" VARCHAR(50),
    "amount" DECIMAL(18,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "thirteenth_salary_item_lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN "thirteenthSalaryItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "thirteenth_salaries_companyId_year_installment_key" ON "thirteenth_salaries"("companyId", "year", "installment");

-- CreateIndex
CREATE INDEX "thirteenth_salaries_companyId_idx" ON "thirteenth_salaries"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "thirteenth_salary_items_thirteenthSalaryId_employeeId_key" ON "thirteenth_salary_items"("thirteenthSalaryId", "employeeId");

-- CreateIndex
CREATE INDEX "thirteenth_salary_items_employeeId_idx" ON "thirteenth_salary_items"("employeeId");

-- CreateIndex
CREATE INDEX "thirteenth_salary_item_lines_thirteenthSalaryItemId_idx" ON "thirteenth_salary_item_lines"("thirteenthSalaryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_thirteenthSalaryItemId_key" ON "financial_entries"("thirteenthSalaryItemId");

-- AddForeignKey
ALTER TABLE "thirteenth_salaries" ADD CONSTRAINT "thirteenth_salaries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thirteenth_salary_items" ADD CONSTRAINT "thirteenth_salary_items_thirteenthSalaryId_fkey" FOREIGN KEY ("thirteenthSalaryId") REFERENCES "thirteenth_salaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thirteenth_salary_items" ADD CONSTRAINT "thirteenth_salary_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thirteenth_salary_item_lines" ADD CONSTRAINT "thirteenth_salary_item_lines_thirteenthSalaryItemId_fkey" FOREIGN KEY ("thirteenthSalaryItemId") REFERENCES "thirteenth_salary_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_thirteenthSalaryItemId_fkey" FOREIGN KEY ("thirteenthSalaryItemId") REFERENCES "thirteenth_salary_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
