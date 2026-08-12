-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "badgeCode" VARCHAR(30);

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_badgeCode_key" ON "public"."employees"("companyId", "badgeCode");
