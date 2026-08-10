-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "leaveDays" INTEGER,
ADD COLUMN     "leaveEndDate" TIMESTAMP(3),
ADD COLUMN     "leaveStartDate" TIMESTAMP(3),
ADD COLUMN     "onVacation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vacationDays" INTEGER,
ADD COLUMN     "vacationEndDate" TIMESTAMP(3),
ADD COLUMN     "vacationStartDate" TIMESTAMP(3);
