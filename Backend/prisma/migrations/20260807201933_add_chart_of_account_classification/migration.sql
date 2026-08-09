-- CreateTable
CREATE TABLE "chart_of_account_classifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_account_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_of_account_classifications_companyId_idx" ON "chart_of_account_classifications"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_classifications_companyId_name_key" ON "chart_of_account_classifications"("companyId", "name");

-- AddForeignKey
ALTER TABLE "chart_of_account_classifications" ADD CONSTRAINT "chart_of_account_classifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cria uma classificação para cada texto distinto já usado
INSERT INTO "chart_of_account_classifications" ("id", "companyId", "name", "active", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "companyId" || "classification"), "companyId", "classification", true, now(), now()
FROM (SELECT DISTINCT "companyId", "classification" FROM "chart_of_accounts") AS distinct_classifications;

-- AlterTable: adiciona a nova coluna de referência (ainda opcional)
ALTER TABLE "chart_of_accounts" ADD COLUMN "classificationId" TEXT;

-- Backfill: liga cada conta à classificação correspondente
UPDATE "chart_of_accounts" coa
SET "classificationId" = cls."id"
FROM "chart_of_account_classifications" cls
WHERE cls."companyId" = coa."companyId" AND cls."name" = coa."classification";

-- AlterTable: torna obrigatória e remove a coluna de texto antiga
ALTER TABLE "chart_of_accounts" ALTER COLUMN "classificationId" SET NOT NULL;
ALTER TABLE "chart_of_accounts" DROP COLUMN "classification";

-- CreateIndex
CREATE INDEX "chart_of_accounts_classificationId_idx" ON "chart_of_accounts"("classificationId");

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "chart_of_account_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
