-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "hiddenMenuItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
