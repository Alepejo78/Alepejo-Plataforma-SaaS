-- CreateTable
CREATE TABLE "public"."scheduled_notification_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "announcementHeader" TEXT,
    "announcementFooter" TEXT,
    "examReminderSubject" VARCHAR(200),
    "examReminderMessage" TEXT,
    "birthdaySubject" VARCHAR(200),
    "birthdayMessage" TEXT,
    "hourBankClosingSubject" VARCHAR(200),
    "hourBankClosingMessage" TEXT,
    "pointClosingSubject" VARCHAR(200),
    "pointClosingMessage" TEXT,
    "paymentReminderBeforeSubject" VARCHAR(200),
    "paymentReminderBeforeMessage" TEXT,
    "paymentReminderOverdueSubject" VARCHAR(200),
    "paymentReminderOverdueMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."document_template_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pdfHeader" TEXT,
    "pdfFooter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_template_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_notification_settings_companyId_key" ON "public"."scheduled_notification_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "document_template_settings_companyId_key" ON "public"."document_template_settings"("companyId");

-- AddForeignKey
ALTER TABLE "public"."scheduled_notification_settings" ADD CONSTRAINT "scheduled_notification_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."document_template_settings" ADD CONSTRAINT "document_template_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
