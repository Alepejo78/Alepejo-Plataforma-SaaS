-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('BIRTHDAY_TODAY', 'EXAM_DUE', 'FINANCIAL_DUE_TODAY', 'FINANCIAL_OVERDUE', 'NEW_PARTNER', 'NEW_PRODUCT', 'NEW_EMPLOYEE', 'APPROVAL_PENDING', 'LICENSE_EXPIRING', 'LOW_STOCK');

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "rootCompanyId" TEXT,
    "type" "public"."NotificationType" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "permissionCode" VARCHAR(60) NOT NULL,
    "linkUrl" VARCHAR(300),
    "documentRef" VARCHAR(100),
    "actorUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_companyId_readAt_idx" ON "public"."notifications"("companyId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_rootCompanyId_readAt_idx" ON "public"."notifications"("rootCompanyId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupeKey_companyId_rootCompanyId_key" ON "public"."notifications"("dedupeKey", "companyId", "rootCompanyId");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
