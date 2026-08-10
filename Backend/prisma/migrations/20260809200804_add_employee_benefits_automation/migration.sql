-- AlterTable: novos campos em employees (mantém transportVoucher por enquanto,
-- só removemos depois de preservar os dados dele abaixo)
ALTER TABLE "public"."employees"
  ADD COLUMN "experienceStageDays" INTEGER DEFAULT 30,
  ADD COLUMN "pantsSize" VARCHAR(10),
  ADD COLUMN "shirtSize" VARCHAR(10),
  ADD COLUMN "shoeSize" VARCHAR(10);

-- CreateTable
CREATE TABLE "public"."benefits" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_benefits" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "value" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "benefits_companyId_idx" ON "public"."benefits"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "benefits_companyId_name_key" ON "public"."benefits"("companyId", "name");

-- CreateIndex
CREATE INDEX "employee_benefits_employeeId_idx" ON "public"."employee_benefits"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_benefits_employeeId_benefitId_key" ON "public"."employee_benefits"("employeeId", "benefitId");

-- AddForeignKey
ALTER TABLE "public"."benefits" ADD CONSTRAINT "benefits_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_benefits" ADD CONSTRAINT "employee_benefits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_benefits" ADD CONSTRAINT "employee_benefits_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "public"."benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: preserva o antigo employees.transportVoucher=true como um
-- registro em employee_benefits ligado a um benefício "Vale Transporte"
-- (criado aqui por empresa que tiver algum colaborador com o campo true;
-- o seed.ts depois faz upsert desse mesmo benefício pra todas as empresas).
INSERT INTO "public"."benefits" ("id", "companyId", "name", "active", "createdAt", "updatedAt")
SELECT md5(c."id" || 'vale-transporte' || clock_timestamp()::text), c."id", 'Vale Transporte', true, now(), now()
FROM "public"."companies" c
WHERE EXISTS (
  SELECT 1 FROM "public"."employees" e
  WHERE e."companyId" = c."id" AND e."transportVoucher" = true
);

INSERT INTO "public"."employee_benefits" ("id", "employeeId", "benefitId", "value", "createdAt")
SELECT md5(e."id" || b."id" || clock_timestamp()::text), e."id", b."id", NULL, now()
FROM "public"."employees" e
JOIN "public"."benefits" b
  ON b."companyId" = e."companyId" AND b."name" = 'Vale Transporte'
WHERE e."transportVoucher" = true;

-- AlterTable: agora sim remove a coluna antiga, já preservada acima
ALTER TABLE "public"."employees" DROP COLUMN "transportVoucher";
