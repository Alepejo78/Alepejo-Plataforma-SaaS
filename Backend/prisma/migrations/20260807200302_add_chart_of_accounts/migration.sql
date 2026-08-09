-- CreateEnum
CREATE TYPE "public"."ChartOfAccountType" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "public"."chart_of_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "classification" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "type" "public"."ChartOfAccountType" NOT NULL DEFAULT 'DESPESA',
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_of_accounts_companyId_idx" ON "public"."chart_of_accounts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_companyId_code_key" ON "public"."chart_of_accounts"("companyId", "code");

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
