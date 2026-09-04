-- CreateTable
CREATE TABLE "public"."payment_reminder_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "daysBeforeDue" INTEGER NOT NULL DEFAULT 3,
    "daysAfterDue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_reminder_settings_companyId_key" ON "public"."payment_reminder_settings"("companyId");

-- AddForeignKey
ALTER TABLE "public"."payment_reminder_settings" ADD CONSTRAINT "payment_reminder_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

