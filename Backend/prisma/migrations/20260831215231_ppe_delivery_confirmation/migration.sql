-- CreateEnum
CREATE TYPE "public"."PpeDeliveryStatus" AS ENUM ('PENDENTE', 'CONFIRMADO');

-- AlterTable
ALTER TABLE "public"."ppe_deliveries" ADD COLUMN     "confirmationSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "confirmationTokenHash" VARCHAR(64),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "status" "public"."PpeDeliveryStatus" NOT NULL DEFAULT 'PENDENTE';
