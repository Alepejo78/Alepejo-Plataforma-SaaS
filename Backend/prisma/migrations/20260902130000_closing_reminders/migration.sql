-- AlterEnum
ALTER TYPE "public"."NotificationType" ADD VALUE 'HOUR_BANK_CLOSING';
ALTER TYPE "public"."NotificationType" ADD VALUE 'POINT_MONTH_CLOSING';

-- AlterTable
ALTER TABLE "public"."payroll_settings" ADD COLUMN     "hourBankClosingReminderDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "pointClosingReminderDays" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "public"."notifications"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
