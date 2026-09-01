-- CreateEnum
CREATE TYPE "public"."PayrollConfirmationStatus" AS ENUM ('PENDENTE', 'CONFIRMADO');

-- AlterTable
ALTER TABLE "public"."payroll_items" ADD COLUMN     "benefitDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationStatus" "public"."PayrollConfirmationStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" VARCHAR(64),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT;
