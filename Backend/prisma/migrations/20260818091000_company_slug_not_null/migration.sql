-- Trava a coluna como NOT NULL depois do backfill
-- (prisma/scripts/backfill-company-slugs.ts) já ter rodado.
ALTER TABLE "companies" ALTER COLUMN "slug" SET NOT NULL;
