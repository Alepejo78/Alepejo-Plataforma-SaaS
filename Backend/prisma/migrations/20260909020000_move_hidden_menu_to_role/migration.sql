-- AlterTable
ALTER TABLE "public"."companies" DROP COLUMN "hiddenMenuItemIds";

-- AlterTable
ALTER TABLE "public"."roles" ADD COLUMN     "hiddenMenuItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
