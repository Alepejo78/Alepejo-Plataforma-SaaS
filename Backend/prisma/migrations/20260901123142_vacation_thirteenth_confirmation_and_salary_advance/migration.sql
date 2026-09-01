-- AlterTable
ALTER TABLE "public"."financial_entries" ADD COLUMN     "salaryAdvanceId" TEXT;

-- AlterTable
ALTER TABLE "public"."thirteenth_salary_items" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationStatus" "public"."PayrollConfirmationStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" VARCHAR(64),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT;

-- AlterTable
ALTER TABLE "public"."vacation_grants" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationStatus" "public"."PayrollConfirmationStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" VARCHAR(64),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT;

-- CreateTable
CREATE TABLE "public"."salary_advances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,2) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "observation" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "confirmationStatus" "public"."PayrollConfirmationStatus" NOT NULL DEFAULT 'PENDENTE',
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "confirmationTokenHash" VARCHAR(64),
    "confirmationTokenExpiresAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salary_advances_companyId_idx" ON "public"."salary_advances"("companyId");

-- CreateIndex
CREATE INDEX "salary_advances_employeeId_idx" ON "public"."salary_advances"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_salaryAdvanceId_key" ON "public"."financial_entries"("salaryAdvanceId");

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_salaryAdvanceId_fkey" FOREIGN KEY ("salaryAdvanceId") REFERENCES "public"."salary_advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_advances" ADD CONSTRAINT "salary_advances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."salary_advances" ADD CONSTRAINT "salary_advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

