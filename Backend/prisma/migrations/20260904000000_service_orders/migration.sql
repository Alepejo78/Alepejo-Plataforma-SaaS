-- CreateEnum
CREATE TYPE "public"."ServiceOrderStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'REVISION_REQUESTED', 'CONFIRMED', 'CONVERTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'SERVICE_ORDER_REVISION_REQUESTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'SERVICE_ORDER_CANCELLED_BY_CUSTOMER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'SERVICE_ORDER_CONFIRMED_BY_CUSTOMER';

-- AlterTable
ALTER TABLE "public"."sales_orders" ADD COLUMN     "serviceOrderId" TEXT;

-- CreateTable
CREATE TABLE "public"."service_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "partnerId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "public"."ServiceOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "observation" TEXT,
    "discountValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freightValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherExpenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "termDays" INTEGER,
    "paymentMethod" "public"."PaymentMethod",
    "installmentsCount" INTEGER DEFAULT 1,
    "plannedInstallments" JSONB,
    "chartOfAccountId" TEXT,
    "quoteId" TEXT,
    "confirmationTokenHash" VARCHAR(64),
    "confirmationTokenExpiresAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "customerConfirmedAt" TIMESTAMP(3),
    "customerRevisionNote" TEXT,
    "customerRevisionAt" TIMESTAMP(3),
    "customerCancelReason" TEXT,
    "customerCancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_order_service_items" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "service_order_service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_order_product_items" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "totalPrice" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "service_order_product_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_quoteId_key" ON "public"."service_orders"("quoteId");

-- CreateIndex
CREATE INDEX "service_orders_companyId_idx" ON "public"."service_orders"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_companyId_number_key" ON "public"."service_orders"("companyId", "number");

-- CreateIndex
CREATE INDEX "service_order_service_items_serviceOrderId_idx" ON "public"."service_order_service_items"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_product_items_serviceOrderId_idx" ON "public"."service_order_product_items"("serviceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_serviceOrderId_key" ON "public"."sales_orders"("serviceOrderId");

-- AddForeignKey
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_orders" ADD CONSTRAINT "service_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_orders" ADD CONSTRAINT "service_orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."business_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_orders" ADD CONSTRAINT "service_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_orders" ADD CONSTRAINT "service_orders_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_orders" ADD CONSTRAINT "service_orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_order_service_items" ADD CONSTRAINT "service_order_service_items_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_order_service_items" ADD CONSTRAINT "service_order_service_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_order_product_items" ADD CONSTRAINT "service_order_product_items_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "public"."service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_order_product_items" ADD CONSTRAINT "service_order_product_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

