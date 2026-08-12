-- AlterEnum
ALTER TYPE "public"."TimeEntrySource" ADD VALUE 'AUTOLANCAMENTO';

-- AlterTable
ALTER TABLE "public"."employees" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "public"."employees"("userId");

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

