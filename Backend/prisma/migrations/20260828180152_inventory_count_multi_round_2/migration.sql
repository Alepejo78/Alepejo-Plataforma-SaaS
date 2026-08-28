-- CreateEnum
CREATE TYPE "public"."InventoryCountItemStatus" AS ENUM ('PENDING', 'RECOUNT_2', 'RECOUNT_3', 'DONE');

-- RenameColumn (preserva o dado das contagens já feitas — a 1ª rodada
-- é o que já estava em countedQuantity)
ALTER TABLE "public"."inventory_count_items" RENAME COLUMN "countedQuantity" TO "countedQuantity1";

-- AlterTable
ALTER TABLE "public"."inventory_count_items"
ADD COLUMN     "addedDuringCount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "countedById1" TEXT,
ADD COLUMN     "countedById2" TEXT,
ADD COLUMN     "countedById3" TEXT,
ADD COLUMN     "countedQuantity2" DECIMAL(18,3),
ADD COLUMN     "countedQuantity3" DECIMAL(18,3),
ADD COLUMN     "status" "public"."InventoryCountItemStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."inventory_counts" ADD COLUMN     "adjustedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'OPEN';
