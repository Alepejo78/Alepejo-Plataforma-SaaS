/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Made the column `passwordHash` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "public"."UserStatus" ADD VALUE 'PASSWORD_EXPIRED';

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "password",
ALTER COLUMN "passwordHash" SET NOT NULL;
