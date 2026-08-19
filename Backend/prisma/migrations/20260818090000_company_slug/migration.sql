-- Slug amigável de URL para cada empresa (link fixo de login).
-- Nullable por enquanto: as empresas que já existem ganham o slug via
-- backfill (prisma/scripts/backfill-company-slugs.ts) antes da
-- próxima migration travar a coluna como NOT NULL.
ALTER TABLE "companies" ADD COLUMN "slug" VARCHAR(80);

CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
