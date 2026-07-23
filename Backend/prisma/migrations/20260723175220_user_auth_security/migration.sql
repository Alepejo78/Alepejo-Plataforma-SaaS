-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'LOCKED', 'BLOCKED', 'DISABLED');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginIp" VARCHAR(45),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" VARCHAR(255),
ADD COLUMN     "refreshTokenHash" VARCHAR(255),
ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION';

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");
