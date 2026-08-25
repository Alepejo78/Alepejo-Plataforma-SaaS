-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "installmentsCount" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."sales_orders" ADD COLUMN     "installmentsCount" INTEGER DEFAULT 1,
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "termDays" INTEGER;
