-- CreateTable
CREATE TABLE "public"."user_companies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_companies_companyId_idx" ON "public"."user_companies"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_userId_companyId_key" ON "public"."user_companies"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "public"."user_companies" ADD CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_companies" ADD CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada usuário existente ganha o vínculo com a empresa que já
-- era a dele (User.companyId), preservando o acesso atual sem nenhuma
-- mudança de comportamento.
INSERT INTO "public"."user_companies" ("id", "userId", "companyId", "createdAt")
SELECT gen_random_uuid()::text, "id", "companyId", CURRENT_TIMESTAMP
FROM "public"."users"
WHERE "deletedAt" IS NULL;
