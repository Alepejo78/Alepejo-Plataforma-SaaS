-- CreateTable
CREATE TABLE "pending_checkouts" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "moduleIds" TEXT[],
    "document" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "asaasCustomerId" VARCHAR(50),
    "asaasSubscriptionId" VARCHAR(50),
    "asaasPaymentId" VARCHAR(50),
    "billingType" VARCHAR(20) NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "companyId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_checkouts_asaasPaymentId_key" ON "pending_checkouts"("asaasPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "pending_checkouts_companyId_key" ON "pending_checkouts"("companyId");

-- CreateIndex
CREATE INDEX "pending_checkouts_planId_idx" ON "pending_checkouts"("planId");

-- CreateIndex
CREATE INDEX "pending_checkouts_asaasSubscriptionId_idx" ON "pending_checkouts"("asaasSubscriptionId");

-- AddForeignKey
ALTER TABLE "pending_checkouts" ADD CONSTRAINT "pending_checkouts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
