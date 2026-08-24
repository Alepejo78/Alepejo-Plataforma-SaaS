-- Número de parcelas em Cotação (proposta), Pedido de Compra e
-- Compra — junto com o prazo já existente, gera N títulos no
-- recebimento em vez de um só (termDays x 1/2/3...).
--
-- Pedido de Compra ganha prazo/forma de pagamento/parcelas do zero —
-- hoje não tinha nenhum dos três, então nunca herdava nada da
-- proposta vencedora de uma Cotação.

ALTER TABLE "public"."quotation_offers"
  ADD COLUMN "installmentsCount" INTEGER DEFAULT 1;

ALTER TABLE "public"."purchase_orders"
  ADD COLUMN "termDays" INTEGER,
  ADD COLUMN "paymentMethod" "public"."PaymentMethod",
  ADD COLUMN "installmentsCount" INTEGER DEFAULT 1;

ALTER TABLE "public"."purchases"
  ADD COLUMN "installmentsCount" INTEGER DEFAULT 1;
