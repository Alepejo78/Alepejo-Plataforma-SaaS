-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "rootCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_rootCompanyId_fkey" FOREIGN KEY ("rootCompanyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
