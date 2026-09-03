-- CreateTable
CREATE TABLE "public"."site_visit_counters" (
    "id" TEXT NOT NULL,
    "page" VARCHAR(60) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_visit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_visit_counters_page_key" ON "public"."site_visit_counters"("page");

