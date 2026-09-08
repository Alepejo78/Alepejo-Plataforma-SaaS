/** Empurra sábado/domingo para a próxima segunda-feira. */
function toNextBusinessDay(value: Date): Date {
  const result = new Date(value);
  const day = result.getUTCDay();

  if (day === 6) {
    result.setUTCDate(result.getUTCDate() + 2);
  } else if (day === 0) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

/**
 * Soma meses de calendário mantendo o dia (cai no último dia do mês
 * quando ele não existir, ex.: 31/01 + 1 mês = 28 ou 29/02) — mesma
 * lógica do backend (`business-day.util.ts`).
 */
function addCalendarMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const result = new Date(date);

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const daysInMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(day, daysInMonth));

  return result;
}

/**
 * Prévia do vencimento: data + prazo, ajustado para nunca cair em
 * sábado ou domingo. Prazo de 30 dias é tratado como parcelamento
 * mensal (mesmo dia do mês seguinte), não 30 dias corridos — mesma
 * regra do backend, que sempre recalcula o valor definitivo ao
 * salvar.
 */
export function calculateDueDatePreview(
  isoDate: string | undefined,
  termDays: number
): Date {
  const base = isoDate ? new Date(`${isoDate}T00:00:00Z`) : new Date();

  const due =
    termDays === 30
      ? addCalendarMonths(base, 1)
      : (() => {
          const d = new Date(base);
          d.setUTCDate(d.getUTCDate() + termDays);
          return d;
        })();

  return toNextBusinessDay(due);
}
