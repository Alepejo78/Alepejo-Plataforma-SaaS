-- CreateEnum
CREATE TYPE "public"."ExamStatus" AS ENUM ('NO_PRAZO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "public"."BenefitCalculationType" AS ENUM ('FIXED', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "public"."benefits" ADD COLUMN "calculationType" "public"."BenefitCalculationType" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "public"."employee_benefits" ADD COLUMN "percentage" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "public"."employee_exams" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "nextExamDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."ExamStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_exams_employeeId_idx" ON "public"."employee_exams"("employeeId");

-- AddForeignKey
ALTER TABLE "public"."employee_exams" ADD CONSTRAINT "employee_exams_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: preserva o antigo employees.examDate como o primeiro
-- registro de histórico (nextExamDate = +1 ano, status assumido em dia
-- já que não dá pra saber o prazo anterior de verdade)
INSERT INTO "public"."employee_exams" ("id", "employeeId", "examDate", "nextExamDate", "status", "createdAt")
SELECT
  md5(e."id" || 'exam-migrated' || clock_timestamp()::text),
  e."id",
  e."examDate",
  e."examDate" + INTERVAL '1 year',
  'NO_PRAZO',
  now()
FROM "public"."employees" e
WHERE e."examDate" IS NOT NULL;

UPDATE "public"."employees" e
SET "nextExamDate" = e."examDate" + INTERVAL '1 year'
WHERE e."examDate" IS NOT NULL;

-- AlterTable: agora sim remove as colunas antigas, já preservadas acima
ALTER TABLE "public"."employees" DROP COLUMN "examCompleted",
DROP COLUMN "examDate";
