-- CreateEnum
CREATE TYPE "public"."Weekday" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- AlterEnum
ALTER TYPE "public"."TimeEntrySource" ADD VALUE 'AJUSTE';

-- CreateTable
CREATE TABLE "public"."work_schedule_shifts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workScheduleId" TEXT NOT NULL,
    "dayFrom" "public"."Weekday" NOT NULL,
    "dayTo" "public"."Weekday" NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "breakStart" VARCHAR(5),
    "breakEnd" VARCHAR(5),
    "endTime" VARCHAR(5) NOT NULL,
    "lunchBreakMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedule_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_entry_adjustments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "beforeStart" TIMESTAMP(3),
    "beforeBreakStart" TIMESTAMP(3),
    "beforeBreakEnd" TIMESTAMP(3),
    "beforeEnd" TIMESTAMP(3),
    "afterStart" TIMESTAMP(3),
    "afterBreakStart" TIMESTAMP(3),
    "afterBreakEnd" TIMESTAMP(3),
    "afterEnd" TIMESTAMP(3),
    "justification" VARCHAR(500) NOT NULL,
    "adjustedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedule_shifts_companyId_idx" ON "public"."work_schedule_shifts"("companyId");

-- CreateIndex
CREATE INDEX "work_schedule_shifts_workScheduleId_idx" ON "public"."work_schedule_shifts"("workScheduleId");

-- CreateIndex
CREATE INDEX "time_entry_adjustments_companyId_idx" ON "public"."time_entry_adjustments"("companyId");

-- CreateIndex
CREATE INDEX "time_entry_adjustments_employeeId_date_idx" ON "public"."time_entry_adjustments"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "public"."work_schedule_shifts" ADD CONSTRAINT "work_schedule_shifts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_schedule_shifts" ADD CONSTRAINT "work_schedule_shifts_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "public"."work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entry_adjustments" ADD CONSTRAINT "time_entry_adjustments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."time_entry_adjustments" ADD CONSTRAINT "time_entry_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
