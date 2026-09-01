-- AlterTable
ALTER TABLE "public"."financial_entries" ADD COLUMN     "bankAccountId" TEXT;

-- CreateTable
CREATE TABLE "public"."bank_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "bankName" VARCHAR(100) NOT NULL,
    "agency" VARCHAR(20),
    "accountNumber" VARCHAR(20),
    "accountType" "public"."BankAccountType",
    "pixKeyType" "public"."PixKeyType",
    "pixKey" VARCHAR(150),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_companyId_idx" ON "public"."bank_accounts"("companyId");

-- CreateIndex
CREATE INDEX "financial_entries_bankAccountId_idx" ON "public"."financial_entries"("bankAccountId");

-- AddForeignKey
ALTER TABLE "public"."financial_entries" ADD CONSTRAINT "financial_entries_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bank_accounts" ADD CONSTRAINT "bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
