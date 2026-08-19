-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "driverLicense" VARCHAR(20),
ADD COLUMN     "driverLicenseCategory" VARCHAR(10),
ADD COLUMN     "employeeNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_employeeNumber_key" ON "public"."employees"("companyId", "employeeNumber");
