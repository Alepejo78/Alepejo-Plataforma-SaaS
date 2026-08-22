-- Liga a cobrança da assinatura ao título de contas a pagar que ela
-- gera na empresa cliente. Único de propósito: é o que garante que uma
-- mesma cobrança não vire dois títulos quando o webhook do Asaas chega
-- mais de uma vez (PAYMENT_CREATED, depois PAYMENT_RECEIVED...).

ALTER TABLE "public"."financial_entries"
  ADD COLUMN "billingChargeId" TEXT;

CREATE UNIQUE INDEX "financial_entries_billingChargeId_key"
  ON "public"."financial_entries"("billingChargeId");

ALTER TABLE "public"."financial_entries"
  ADD CONSTRAINT "financial_entries_billingChargeId_fkey"
  FOREIGN KEY ("billingChargeId")
  REFERENCES "public"."billing_charges"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
