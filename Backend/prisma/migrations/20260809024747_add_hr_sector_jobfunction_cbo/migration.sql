-- CreateEnum
CREATE TYPE "public"."SalaryType" AS ENUM ('MENSALISTA', 'HORISTA', 'DIARISTA', 'COMISSIONADO', 'OUTRO');

-- CreateTable
CREATE TABLE "public"."cbo_occupations" (
    "code" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,

    CONSTRAINT "cbo_occupations_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."sectors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_functions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "cboCode" VARCHAR(10),
    "cboTitle" VARCHAR(200),
    "sectorId" TEXT,
    "baseSalary" DECIMAL(18,2),
    "salaryType" "public"."SalaryType",
    "workSchedule" VARCHAR(120),
    "requiresPpe" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_functions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cbo_occupations_title_idx" ON "public"."cbo_occupations"("title");

-- CreateIndex
CREATE INDEX "sectors_companyId_idx" ON "public"."sectors"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_companyId_name_key" ON "public"."sectors"("companyId", "name");

-- CreateIndex
CREATE INDEX "job_functions_companyId_idx" ON "public"."job_functions"("companyId");

-- CreateIndex
CREATE INDEX "job_functions_sectorId_idx" ON "public"."job_functions"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "job_functions_companyId_name_key" ON "public"."job_functions"("companyId", "name");

-- AddForeignKey
ALTER TABLE "public"."sectors" ADD CONSTRAINT "sectors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_functions" ADD CONSTRAINT "job_functions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_functions" ADD CONSTRAINT "job_functions_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "public"."sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
