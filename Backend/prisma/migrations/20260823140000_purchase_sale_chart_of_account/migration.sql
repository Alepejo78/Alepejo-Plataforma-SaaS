-- Tipo de despesa/receita na compra e na venda.
--
-- O título que nasce do recebimento de uma compra (ou da aprovação de
-- uma venda) já leva a conta do plano de contas escolhida no próprio
-- documento. Antes o título nascia sem classificação e alguém tinha
-- que abrir Contas a pagar depois pra escolher uma por uma — e, na
-- prática, quase nunca escolhia, o que deixava o acompanhamento de
-- despesas por tipo sem dado nenhum.
--
-- SET NULL na exclusão da conta: apagar uma conta do plano não pode
-- derrubar a compra/venda, que é documento.

ALTER TABLE "public"."purchases"
  ADD COLUMN "chartOfAccountId" TEXT;

ALTER TABLE "public"."sales"
  ADD COLUMN "chartOfAccountId" TEXT;

CREATE INDEX "purchases_chartOfAccountId_idx"
  ON "public"."purchases"("chartOfAccountId");

CREATE INDEX "sales_chartOfAccountId_idx"
  ON "public"."sales"("chartOfAccountId");

ALTER TABLE "public"."purchases"
  ADD CONSTRAINT "purchases_chartOfAccountId_fkey"
  FOREIGN KEY ("chartOfAccountId")
  REFERENCES "public"."chart_of_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."sales"
  ADD CONSTRAINT "sales_chartOfAccountId_fkey"
  FOREIGN KEY ("chartOfAccountId")
  REFERENCES "public"."chart_of_accounts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
