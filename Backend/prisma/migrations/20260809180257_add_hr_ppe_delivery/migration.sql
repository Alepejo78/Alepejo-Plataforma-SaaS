-- CreateTable
CREATE TABLE "public"."ppe_deliveries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "ppeTypeId" TEXT NOT NULL,
    "ca" VARCHAR(20),
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observation" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppe_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppe_deliveries_companyId_idx" ON "public"."ppe_deliveries"("companyId");

-- CreateIndex
CREATE INDEX "ppe_deliveries_employeeId_idx" ON "public"."ppe_deliveries"("employeeId");

-- AddForeignKey
ALTER TABLE "public"."ppe_deliveries" ADD CONSTRAINT "ppe_deliveries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ppe_deliveries" ADD CONSTRAINT "ppe_deliveries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ppe_deliveries" ADD CONSTRAINT "ppe_deliveries_ppeTypeId_fkey" FOREIGN KEY ("ppeTypeId") REFERENCES "public"."ppe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
