-- CreateEnum
CREATE TYPE "public"."QuotePurpose" AS ENUM ('SALE', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."QuoteItemKind" AS ENUM ('PRODUCT', 'SERVICE');

-- AlterEnum
ALTER TYPE "public"."NotificationType" ADD VALUE 'QUOTE_SERVICE_APPROVED';

-- AlterTable
ALTER TABLE "public"."quotes" ADD COLUMN     "purpose" "public"."QuotePurpose" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "serviceDescription" TEXT;

-- AlterTable
ALTER TABLE "public"."quote_items" ADD COLUMN     "itemKind" "public"."QuoteItemKind" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN     "description" TEXT;
