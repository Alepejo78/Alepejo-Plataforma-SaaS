export type PeriodKind = 'day' | 'week' | 'month';

/**
 * Início/fim (UTC, meia-noite) do dia/semana/mês que contém
 * `reference` — mesma convenção UTC já usada no resto do domínio
 * financeiro (ver `FinancialEntriesRepository.findForCashFlow`).
 * Semana: segunda a domingo.
 */
export function getPeriodRange(
  period: PeriodKind,
  reference: Date,
): { start: Date; end: Date } {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const day = reference.getUTCDate();

  if (period === 'day') {
    const start = new Date(Date.UTC(year, month, day));
    const end = new Date(Date.UTC(year, month, day + 1));

    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));

    return { start, end };
  }

  // Semana: segunda a domingo. getUTCDay() = 0 (domingo) .. 6 (sábado);
  // distância até a segunda-feira anterior (ou o próprio dia, se já
  // for segunda).
  const weekday = reference.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const start = new Date(Date.UTC(year, month, day - daysSinceMonday));
  const end = new Date(Date.UTC(year, month, day - daysSinceMonday + 7));

  return { start, end };
}
