-- CreateTable
CREATE TABLE "public"."financial_entry_items" (
    "id" TEXT NOT NULL,
    "financialEntryId" TEXT NOT NULL,
    "productId" TEXT,
    "chartOfAccountId" TEXT,
    "description" VARCHAR(255),
    "quantity" DECIMAL(18,3),
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entry_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entry_items_financialEntryId_idx" ON "public"."financial_entry_items"("financialEntryId");

-- AddForeignKey
ALTER TABLE "public"."financial_entry_items" ADD CONSTRAINT "financial_entry_items_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "public"."financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entry_items" ADD CONSTRAINT "financial_entry_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."financial_entry_items" ADD CONSTRAINT "financial_entry_items_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "public"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
