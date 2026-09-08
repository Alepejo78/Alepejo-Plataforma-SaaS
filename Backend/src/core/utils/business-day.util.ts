/**
 * Se a data cair em sábado (6) ou domingo (0), empurra para a
 * próxima segunda-feira. Usa componentes UTC para não sofrer
 * deslocamento de fuso horário em datas gravadas como meia-noite.
 */
export function toNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();

  if (day === 6) {
    result.setUTCDate(result.getUTCDate() + 2);
  } else if (day === 0) {
    result.setUTCDate(result.getUTCDate() + 1);
  }

  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

/**
 * Soma meses de calendário mantendo o dia (cai no último dia do mês
 * quando esse dia não existir nele, ex.: 31/01 + 1 mês = 28 ou
 * 29/02).
 */
function addCalendarMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const result = new Date(date);

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const daysInMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(day, daysInMonth));

  return result;
}

/**
 * Vencimento = data de emissão + prazo, ajustado para dia útil.
 * Prazo de 30 dias é tratado como parcelamento mensal (mesmo dia do
 * mês seguinte, não 30 dias corridos) — decisão do usuário,
 * 08-09-2026: 31/01 + 30 "dias" vence 28/02, não 02/03. Qualquer
 * outro prazo (15, 45, 60...) soma dias corridos normalmente.
 */
export function calculateDueDate(
  issueDate: Date,
  termDays: number,
): Date {
  const dueDate =
    termDays === 30
      ? addCalendarMonths(issueDate, 1)
      : addDays(issueDate, termDays);

  return toNextBusinessDay(dueDate);
}

/**
 * Vencimento da N-ésima parcela de um parcelamento automático (ver
 * `buildAutoInstallments`) — mesma regra de `calculateDueDate`, só
 * que aplicada por parcela: prazo 30 vira "parcela N = emissão + N
 * meses" (mantendo o dia), em vez de N × 30 dias corridos. Ex.:
 * emissão 08/09, prazo 30, 10 parcelas → vencimentos 08/10, 08/11,
 * 08/12... Prazo diferente de 30 continua sendo N × prazo dias
 * corridos, do jeito que já era.
 */
export function calculateInstallmentDueDate(
  issueDate: Date,
  termDays: number,
  installmentNumber: number,
): Date {
  const dueDate =
    termDays === 30
      ? addCalendarMonths(issueDate, installmentNumber)
      : addDays(issueDate, termDays * installmentNumber);

  return toNextBusinessDay(dueDate);
}
