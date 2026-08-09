-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "avatar" VARCHAR(255),
ADD COLUMN     "avatarEnabled" BOOLEAN NOT NULL DEFAULT false;
