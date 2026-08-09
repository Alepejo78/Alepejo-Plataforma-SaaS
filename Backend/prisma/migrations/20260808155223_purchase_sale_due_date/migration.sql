-- AlterTable
ALTER TABLE "public"."purchases" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "termDays" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."sales" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "public"."PaymentMethod",
ADD COLUMN     "termDays" INTEGER DEFAULT 0;
