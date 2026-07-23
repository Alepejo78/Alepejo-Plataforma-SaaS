/*
  Warnings:

  - You are about to alter the column `code` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `legalName` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `tradeName` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `document` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `email` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(150)`.
  - You are about to alter the column `phone` on the `companies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.

*/
-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'BRL',
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "language" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
ADD COLUMN     "logo" VARCHAR(255),
ADD COLUMN     "mobile" VARCHAR(30),
ADD COLUMN     "municipalRegistration" VARCHAR(30),
ADD COLUMN     "stateRegistration" VARCHAR(30),
ADD COLUMN     "timezone" VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
ADD COLUMN     "website" VARCHAR(200),
ALTER COLUMN "code" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "legalName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "tradeName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "document" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(30);
