-- AlterEnum
BEGIN;
CREATE TYPE "public"."ProductionOrderStatus_new" AS ENUM ('AGUARDANDO_PRODUCAO', 'EM_PRODUCAO', 'FINALIZADA', 'CANCELADA');
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" TYPE "public"."ProductionOrderStatus_new" USING ("status"::text::"public"."ProductionOrderStatus_new");
ALTER TYPE "public"."ProductionOrderStatus" RENAME TO "ProductionOrderStatus_old";
ALTER TYPE "public"."ProductionOrderStatus_new" RENAME TO "ProductionOrderStatus";
DROP TYPE "public"."ProductionOrderStatus_old";
ALTER TABLE "public"."production_orders" ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_PRODUCAO';
COMMIT;

-- AlterTable
ALTER TABLE "public"."production_orders" ADD COLUMN     "completionObservation" VARCHAR(500),
ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "productionDays" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'AGUARDANDO_PRODUCAO',
ALTER COLUMN "expectedDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."production_settings" ADD COLUMN     "defaultProductionDays" INTEGER NOT NULL DEFAULT 7;
