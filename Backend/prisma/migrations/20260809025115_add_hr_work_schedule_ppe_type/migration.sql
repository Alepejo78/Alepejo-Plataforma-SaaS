/*
  Warnings:

  - You are about to drop the column `workSchedule` on the `job_functions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."job_functions" DROP COLUMN "workSchedule",
ADD COLUMN     "workScheduleId" TEXT;

-- CreateTable
CREATE TABLE "public"."work_schedules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ppe_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppe_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_JobFunctionToPpeType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobFunctionToPpeType_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "work_schedules_companyId_idx" ON "public"."work_schedules"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_companyId_name_key" ON "public"."work_schedules"("companyId", "name");

-- CreateIndex
CREATE INDEX "ppe_types_companyId_idx" ON "public"."ppe_types"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ppe_types_companyId_name_key" ON "public"."ppe_types"("companyId", "name");

-- CreateIndex
CREATE INDEX "_JobFunctionToPpeType_B_index" ON "public"."_JobFunctionToPpeType"("B");

-- CreateIndex
CREATE INDEX "job_functions_workScheduleId_idx" ON "public"."job_functions"("workScheduleId");

-- AddForeignKey
ALTER TABLE "public"."work_schedules" ADD CONSTRAINT "work_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ppe_types" ADD CONSTRAINT "ppe_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_functions" ADD CONSTRAINT "job_functions_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "public"."work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_JobFunctionToPpeType" ADD CONSTRAINT "_JobFunctionToPpeType_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."job_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_JobFunctionToPpeType" ADD CONSTRAINT "_JobFunctionToPpeType_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."ppe_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
