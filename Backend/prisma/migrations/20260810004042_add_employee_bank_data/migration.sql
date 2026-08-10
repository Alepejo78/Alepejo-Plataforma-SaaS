-- CreateEnum
CREATE TYPE "public"."BankAccountType" AS ENUM ('CORRENTE', 'POUPANCA');

-- CreateEnum
CREATE TYPE "public"."PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "bankAccount" VARCHAR(20),
ADD COLUMN     "bankAccountType" "public"."BankAccountType",
ADD COLUMN     "bankAgency" VARCHAR(20),
ADD COLUMN     "bankName" VARCHAR(100),
ADD COLUMN     "pixKey" VARCHAR(150),
ADD COLUMN     "pixKeyType" "public"."PixKeyType";
