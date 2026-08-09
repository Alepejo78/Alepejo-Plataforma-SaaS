-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."MaritalStatus" AS ENUM ('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'OUTRO');

-- CreateEnum
CREATE TYPE "public"."EducationLevel" AS ENUM ('FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO');

-- CreateEnum
CREATE TYPE "public"."EmployeeStatus" AS ENUM ('EXPERIENCIA', 'ATIVO', 'AFASTADO', 'DEMITIDO');

-- CreateEnum
CREATE TYPE "public"."DependentRelationship" AS ENUM ('FILHO', 'CONJUGE', 'PAI', 'MAE', 'OUTRO');

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "fatherName" VARCHAR(150),
    "motherName" VARCHAR(150),
    "birthDate" TIMESTAMP(3),
    "gender" "public"."Gender",
    "birthCity" VARCHAR(100),
    "birthState" VARCHAR(2),
    "maritalStatus" "public"."MaritalStatus",
    "educationLevel" "public"."EducationLevel",
    "cpf" VARCHAR(14),
    "rg" VARCHAR(20),
    "workCard" VARCHAR(20),
    "workCardSeries" VARCHAR(20),
    "pis" VARCHAR(20),
    "zipCode" VARCHAR(10),
    "street" VARCHAR(200),
    "number" VARCHAR(20),
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "email" VARCHAR(150),
    "jobFunctionId" TEXT,
    "workScheduleId" TEXT,
    "baseSalary" DECIMAL(18,2),
    "salaryType" "public"."SalaryType",
    "paymentMethod" "public"."PaymentMethod",
    "admissionDate" TIMESTAMP(3),
    "experienceEndDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "status" "public"."EmployeeStatus" NOT NULL DEFAULT 'EXPERIENCIA',
    "examDate" TIMESTAMP(3),
    "examCompleted" BOOLEAN NOT NULL DEFAULT false,
    "nextExamDate" TIMESTAMP(3),
    "noticeDays" INTEGER,
    "onLeave" BOOLEAN NOT NULL DEFAULT false,
    "transportVoucher" BOOLEAN NOT NULL DEFAULT false,
    "lockerKey" VARCHAR(20),
    "lockerNumber" VARCHAR(20),
    "observation" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_dependents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "birthDate" TIMESTAMP(3),
    "relationship" "public"."DependentRelationship",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_dependents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "public"."employees"("companyId");

-- CreateIndex
CREATE INDEX "employees_jobFunctionId_idx" ON "public"."employees"("jobFunctionId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_cpf_key" ON "public"."employees"("companyId", "cpf");

-- CreateIndex
CREATE INDEX "employee_dependents_employeeId_idx" ON "public"."employee_dependents"("employeeId");

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "public"."job_functions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "public"."work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_dependents" ADD CONSTRAINT "employee_dependents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
