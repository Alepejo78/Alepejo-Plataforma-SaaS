-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "alias" VARCHAR(150),
ADD COLUMN     "department" VARCHAR(150),
ADD COLUMN     "manager" VARCHAR(150),
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" VARCHAR(255);
