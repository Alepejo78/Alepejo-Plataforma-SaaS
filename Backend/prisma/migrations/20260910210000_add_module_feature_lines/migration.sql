-- CreateTable
CREATE TABLE "public"."module_feature_lines" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "monthlyPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "yearlyPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_feature_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_feature_lines_moduleId_idx" ON "public"."module_feature_lines"("moduleId");

-- AddForeignKey
ALTER TABLE "public"."module_feature_lines" ADD CONSTRAINT "module_feature_lines_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
