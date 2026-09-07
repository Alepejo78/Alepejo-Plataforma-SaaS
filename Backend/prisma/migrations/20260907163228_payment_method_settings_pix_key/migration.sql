-- AlterTable
ALTER TABLE "public"."entry_charges" ADD COLUMN     "publicToken" TEXT;

-- AlterTable
ALTER TABLE "public"."payment_method_settings" ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "pixKeyCity" TEXT,
ADD COLUMN     "pixKeyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pixKeyOwnerName" TEXT,
ADD COLUMN     "pixKeyType" "public"."PixKeyType";

-- CreateIndex
CREATE UNIQUE INDEX "entry_charges_publicToken_key" ON "public"."entry_charges"("publicToken");

