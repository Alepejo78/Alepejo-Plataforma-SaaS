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
