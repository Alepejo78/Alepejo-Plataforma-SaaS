-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "defaultCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_defaultCompanyId_fkey" FOREIGN KEY ("defaultCompanyId") REFERENCES "public"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
