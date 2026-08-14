-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpFromEmail" VARCHAR(150),
ADD COLUMN     "smtpFromName" VARCHAR(150),
ADD COLUMN     "smtpHost" VARCHAR(255),
ADD COLUMN     "smtpPasswordEncrypted" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpUser" VARCHAR(255);
