import { calculateDueDate } from './business-day.util';

/**
 * Gera N parcelas igualmente espaçadas por `termDays` a partir da
 * data de emissão (30/60/90... = termDays × 1/2/3, sem limite de
 * quantidade) — usado quando não vem uma lista de parcelas pronta
 * (`installments[]`), só a quantidade. Divide o valor total em
 * partes iguais, com a última parcela absorvendo o resto do
 * arredondamento (em centavos) pra soma bater certinho com o total.
 */
export function buildAutoInstallments(
  issueDate: Date,
  termDays: number,
  count: number,
  totalAmount: number,
): { dueDate: Date; amount: number }[] {
  const base = Math.floor((totalAmount / count) * 100) / 100;
  const installments: { dueDate: Date; amount: number }[] = [];
  let allocated = 0;

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amount = isLast
      ? Math.round((totalAmount - allocated) * 100) / 100
      : base;

    allocated += amount;

    installments.push({
      dueDate: calculateDueDate(issueDate, termDays * i),
      amount,
    });
  }

  return installments;
}

/**
 * Juros de parcelamento escolhido pelo cliente na aprovação digital do
 * orçamento (ver QuoteConfirmationService.approvePublic) — % fixo por
 * parcela acima do limite sem juros, cumulativo (ex.: limite 3x, taxa
 * 2%, cliente escolhe 5x = 2 parcelas "extras" = +4% sobre o total).
 * Retorna só o valor do JUROS (a somar em cima do total), não o total
 * com juros já embutido.
 */
export function applyInstallmentInterest(
  totalAmount: number,
  installmentsCount: number,
  interestFreeInstallments: number,
  interestRatePerInstallment: number,
): number {
  const chargeableInstallments = Math.max(
    0,
    installmentsCount - interestFreeInstallments,
  );

  if (chargeableInstallments === 0 || interestRatePerInstallment <= 0) {
    return 0;
  }

  return (
    Math.round(
      totalAmount *
        (interestRatePerInstallment / 100) *
        chargeableInstallments *
        100,
    ) / 100
  );
}
