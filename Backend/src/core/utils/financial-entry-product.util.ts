/**
 * Produto/serviço "principal" de um documento com vários itens, pra
 * popular o único campo `FinancialEntry.productId` quando o título é
 * gerado automaticamente (cotação/compra/venda) — regra: com só 1
 * produto distinto entre os itens, usa esse; com mais de um, usa o de
 * maior valor total. Mesmo critério em todo lugar que gera título
 * automático, pra ficar previsível.
 */
export function pickPrimaryProductId(
  items: { productId: string; totalPrice: unknown }[],
): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const distinct = new Set(items.map((item) => item.productId));

  if (distinct.size === 1) {
    return items[0].productId;
  }

  return items.reduce((best, item) =>
    Number(item.totalPrice) > Number(best.totalPrice) ? item : best,
  ).productId;
}
