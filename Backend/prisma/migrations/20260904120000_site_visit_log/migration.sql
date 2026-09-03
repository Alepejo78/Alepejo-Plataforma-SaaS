-- CreateTable
CREATE TABLE "public"."site_visit_logs" (
    "id" TEXT NOT NULL,
    "page" VARCHAR(60) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_visit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_visit_logs_page_ip_day_key" ON "public"."site_visit_logs"("page", "ip", "day");

