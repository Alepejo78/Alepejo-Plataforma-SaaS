-- CreateEnum
CREATE TYPE "public"."BudgetType" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "public"."budgets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "type" "public"."BudgetType" NOT NULL,
    "plannedAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_companyId_idx" ON "public"."budgets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_companyId_year_month_type_key" ON "public"."budgets"("companyId", "year", "month", "type");

-- AddForeignKey
ALTER TABLE "public"."budgets" ADD CONSTRAINT "budgets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
