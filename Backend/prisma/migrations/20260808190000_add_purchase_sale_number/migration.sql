-- AddColumn (nullable first so existing rows can be backfilled)
ALTER TABLE "public"."purchases" ADD COLUMN "number" INTEGER;
ALTER TABLE "public"."sales" ADD COLUMN "number" INTEGER;

-- Backfill: sequential number per company, oldest purchase/sale first
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt") AS rn
  FROM "public"."purchases"
)
UPDATE "public"."purchases" p
SET "number" = numbered.rn
FROM numbered
WHERE p."id" = numbered."id";

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt") AS rn
  FROM "public"."sales"
)
UPDATE "public"."sales" s
SET "number" = numbered.rn
FROM numbered
WHERE s."id" = numbered."id";

-- Make required
ALTER TABLE "public"."purchases" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "public"."sales" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "purchases_companyId_number_key" ON "public"."purchases"("companyId", "number");
CREATE UNIQUE INDEX "sales_companyId_number_key" ON "public"."sales"("companyId", "number");

-- Seed the DocumentSequence counters so future purchases/sales continue
-- numbering from the backfilled maximum instead of restarting at 1.
INSERT INTO "public"."document_sequences" ("id", "companyId", "type", "lastNumber", "createdAt", "updatedAt")
SELECT
  'ds_' || substr(md5(random()::text || clock_timestamp()::text), 1, 22),
  "companyId",
  'PURCHASE',
  MAX("number"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."purchases"
GROUP BY "companyId"
ON CONFLICT ("companyId", "type")
DO UPDATE SET "lastNumber" = GREATEST("document_sequences"."lastNumber", EXCLUDED."lastNumber");

INSERT INTO "public"."document_sequences" ("id", "companyId", "type", "lastNumber", "createdAt", "updatedAt")
SELECT
  'ds_' || substr(md5(random()::text || clock_timestamp()::text), 1, 22),
  "companyId",
  'SALE',
  MAX("number"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."sales"
GROUP BY "companyId"
ON CONFLICT ("companyId", "type")
DO UPDATE SET "lastNumber" = GREATEST("document_sequences"."lastNumber", EXCLUDED."lastNumber");
