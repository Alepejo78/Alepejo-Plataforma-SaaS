import { Weekday } from '@prisma/client';

export const WEEKDAY_ORDER: Weekday[] = [
  Weekday.SEGUNDA,
  Weekday.TERCA,
  Weekday.QUARTA,
  Weekday.QUINTA,
  Weekday.SEXTA,
  Weekday.SABADO,
  Weekday.DOMINGO,
];

/** Dia da semana (JS `Date.getUTCDay()`, 0=domingo) convertido pro enum `Weekday`. */
export function jsDayToWeekday(jsDay: number): Weekday {
  return WEEKDAY_ORDER[(jsDay + 6) % 7];
}

/** Expande uma faixa De/Até (ex.: SEGUNDA a SEXTA) na lista de dias cobertos. Não suporta faixa "dando a volta" (ex.: SEXTA a SEGUNDA). */
export function expandWeekdayRange(
  dayFrom: Weekday,
  dayTo: Weekday,
): Weekday[] {
  const from = WEEKDAY_ORDER.indexOf(dayFrom);
  const to = WEEKDAY_ORDER.indexOf(dayTo);

  if (from === -1 || to === -1 || from > to) {
    return [];
  }

  return WEEKDAY_ORDER.slice(from, to + 1);
}
