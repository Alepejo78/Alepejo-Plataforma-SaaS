-- CreateTable
CREATE TABLE "public"."time_entry_monthly_confirmations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "confirmationStatus" "public"."PayrollConfirmationStatus" NOT NULL DEFAULT 'PENDENTE',
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "confirmationTokenHash" VARCHAR(64),
    "confirmationTokenExpiresAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entry_monthly_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_entry_monthly_confirmations_companyId_idx" ON "public"."time_entry_monthly_confirmations"("companyId");

-- CreateIndex
CREATE INDEX "time_entry_monthly_confirmations_employeeId_idx" ON "public"."time_entry_monthly_confirmations"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "time_entry_monthly_confirmations_companyId_employeeId_year_key" ON "public"."time_entry_monthly_confirmations"("companyId", "employeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "public"."time_entry_monthly_confirmations" ADD CONSTRAINT "time_entry_monthly_confirmations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entry_monthly_confirmations" ADD CONSTRAINT "time_entry_monthly_confirmations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
