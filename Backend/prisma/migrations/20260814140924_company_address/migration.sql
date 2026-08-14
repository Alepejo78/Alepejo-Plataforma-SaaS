-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "number" VARCHAR(20),
ADD COLUMN     "state" VARCHAR(2),
ADD COLUMN     "street" VARCHAR(200),
ADD COLUMN     "zipCode" VARCHAR(10);
