-- CreateEnum
CREATE TYPE "public"."QuotationStatus" AS ENUM ('DRAFT', 'DECIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'CONVERTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."financial_entries" ADD COLUMN     "documentKey" VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."purchases" ADD COLUMN     "invoiceIssueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceKey" VARCHAR(50),
ADD COLUMN     "invoiceNumber" VARCHAR(50),
ADD COLUMN     "purchaseOrderId" TEXT;

-- CreateTable
CREATE TABLE "public"."quotations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "public"."QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "quotationDate" TIMESTAMP(3),
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotation_items" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotation_offers" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "termDays" INTEGER,
    "paymentMethod" "public"."PaymentMethod",
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotation_offer_items" (
    "id" TEXT NOT NULL,
    "quotationOfferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "quotation_offer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "partnerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3),
    "observation" TEXT,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "quotationId" TEXT,
    "quotationOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotations_companyId_idx" ON "public"."quotations"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_companyId_number_key" ON "public"."quotations"("companyId", "number");

-- CreateIndex
CREATE INDEX "quotation_items_quotationId_idx" ON "public"."quotation_items"("quotationId");

-- CreateIndex
CREATE INDEX "quotation_offers_quotationId_idx" ON "public"."quotation_offers"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_offers_quotationId_partnerId_key" ON "public"."quotation_offers"("quotationId", "partnerId");

-- CreateIndex
CREATE INDEX "quotation_offer_items_quotationOfferId_idx" ON "public"."quotation_offer_items"("quotationOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_quotationOfferId_key" ON "public"."purchase_orders"("quotationOfferId");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_idx" ON "public"."purchase_orders"("companyId");

-- CreateIndex
CREATE INDEX "purchase_orders_quotationId_idx" ON "public"."purchase_orders"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_companyId_number_key" ON "public"."purchase_orders"("companyId", "number");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "public"."purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchaseOrderId_key" ON "public"."purchases"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotations" ADD CONSTRAINT "quotations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotations" ADD CONSTRAINT "quotations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_items" ADD CONSTRAINT "quotation_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_offers" ADD CONSTRAINT "quotation_offers_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_offers" ADD CONSTRAINT "quotation_offers_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_offer_items" ADD CONSTRAINT "quotation_offer_items_quotationOfferId_fkey" FOREIGN KEY ("quotationOfferId") REFERENCES "public"."quotation_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotation_offer_items" ADD CONSTRAINT "quotation_offer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "public"."quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_quotationOfferId_fkey" FOREIGN KEY ("quotationOfferId") REFERENCES "public"."quotation_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

