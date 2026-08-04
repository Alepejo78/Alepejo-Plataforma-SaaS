-- CreateEnum
CREATE TYPE "public"."SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."InventoryControl" AS ENUM ('NONE', 'SIMPLE', 'BATCH', 'SERIAL');

-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'TRANSFER');

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "corporateName" VARCHAR(200) NOT NULL,
    "tradeName" VARCHAR(200),
    "document" VARCHAR(20) NOT NULL,
    "stateRegistration" VARCHAR(30),
    "email" VARCHAR(150),
    "phone" VARCHAR(30),
    "mobile" VARCHAR(30),
    "contact" VARCHAR(150),
    "zipCode" VARCHAR(15),
    "street" VARCHAR(150),
    "number" VARCHAR(20),
    "complement" VARCHAR(100),
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "notes" TEXT,
    "status" "public"."SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."units" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "description" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT,
    "brandId" TEXT,
    "unitId" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "barcode" VARCHAR(30),
    "description" VARCHAR(200) NOT NULL,
    "complementaryDescription" VARCHAR(255),
    "type" "public"."ProductType" NOT NULL DEFAULT 'PRODUCT',
    "inventoryControl" "public"."InventoryControl" NOT NULL DEFAULT 'SIMPLE',
    "cost" DECIMAL(18,2) NOT NULL,
    "salePrice" DECIMAL(18,2) NOT NULL,
    "minimumStock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "currentStock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "status" "public"."ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."warehouses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productCategoryId" TEXT,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stock_movements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "public"."StockMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitCost" DECIMAL(18,4),
    "observation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_companyId_idx" ON "public"."suppliers"("companyId");

-- CreateIndex
CREATE INDEX "suppliers_corporateName_idx" ON "public"."suppliers"("corporateName");

-- CreateIndex
CREATE INDEX "suppliers_document_idx" ON "public"."suppliers"("document");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_companyId_document_key" ON "public"."suppliers"("companyId", "document");

-- CreateIndex
CREATE INDEX "product_categories_companyId_idx" ON "public"."product_categories"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_companyId_name_key" ON "public"."product_categories"("companyId", "name");

-- CreateIndex
CREATE INDEX "brands_companyId_idx" ON "public"."brands"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "brands_companyId_name_key" ON "public"."brands"("companyId", "name");

-- CreateIndex
CREATE INDEX "units_companyId_idx" ON "public"."units"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "units_companyId_code_key" ON "public"."units"("companyId", "code");

-- CreateIndex
CREATE INDEX "products_companyId_idx" ON "public"."products"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "products_companyId_code_key" ON "public"."products"("companyId", "code");

-- CreateIndex
CREATE INDEX "warehouses_companyId_idx" ON "public"."warehouses"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_companyId_code_key" ON "public"."warehouses"("companyId", "code");

-- CreateIndex
CREATE INDEX "inventories_companyId_idx" ON "public"."inventories"("companyId");

-- CreateIndex
CREATE INDEX "inventories_productId_idx" ON "public"."inventories"("productId");

-- CreateIndex
CREATE INDEX "inventories_warehouseId_idx" ON "public"."inventories"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_companyId_productId_warehouseId_key" ON "public"."inventories"("companyId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_movements_companyId_idx" ON "public"."stock_movements"("companyId");

-- CreateIndex
CREATE INDEX "stock_movements_inventoryId_idx" ON "public"."stock_movements"("inventoryId");

-- AddForeignKey
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."brands" ADD CONSTRAINT "brands_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."units" ADD CONSTRAINT "units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "public"."units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."warehouses" ADD CONSTRAINT "warehouses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventories" ADD CONSTRAINT "inventories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventories" ADD CONSTRAINT "inventories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventories" ADD CONSTRAINT "inventories_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventories" ADD CONSTRAINT "inventories_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
