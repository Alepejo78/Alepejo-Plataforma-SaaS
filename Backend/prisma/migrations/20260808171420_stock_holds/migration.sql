-- CreateEnum
CREATE TYPE "public"."StockHoldType" AS ENUM ('BLOCKED', 'RESERVED', 'QUARANTINE', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."StockHoldStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- AlterTable
ALTER TABLE "public"."inventories" ADD COLUMN     "blockedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "damagedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "quarantineQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "reservedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."stock_holds" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "public"."StockHoldType" NOT NULL,
    "status" "public"."StockHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "quantity" DECIMAL(18,4) NOT NULL,
    "reason" VARCHAR(255),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_holds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_holds_companyId_idx" ON "public"."stock_holds"("companyId");

-- CreateIndex
CREATE INDEX "stock_holds_inventoryId_idx" ON "public"."stock_holds"("inventoryId");

-- CreateIndex
CREATE INDEX "stock_holds_type_status_idx" ON "public"."stock_holds"("type", "status");

-- AddForeignKey
ALTER TABLE "public"."stock_holds" ADD CONSTRAINT "stock_holds_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_holds" ADD CONSTRAINT "stock_holds_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
