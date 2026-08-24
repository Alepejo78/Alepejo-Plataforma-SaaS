-- Peso e cubagem do produto (logística/frete).
--
-- O campo que já existia (`inventoryControl`) passa a ser checado de
-- verdade no recebimento de compra e na aprovação de venda — item com
-- `NONE` não gera Inventory/StockMovement. Não muda o schema, só o
-- código que usa esse campo.

ALTER TABLE "public"."products"
  ADD COLUMN "weightKg" DECIMAL(10,3),
  ADD COLUMN "cubageM3" DECIMAL(10,4);
