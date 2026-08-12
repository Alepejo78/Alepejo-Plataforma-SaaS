import { Weekday } from '@prisma/client';

/** Meia-noite UTC do dia — mesmo padrão de "data de calendário" usado no resto do sistema. */
export function utcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

/**
 * Converte um horário "HH:MM" (digitado como hora local do Brasil,
 * ex.: no ajuste manual de ponto) pro instante UTC correspondente,
 * num dia de calendário (meia-noite UTC) já dado. Brasil não observa
 * horário de verão desde 2019 — sempre UTC-3, mesmo padrão já usado
 * em outros pontos do sistema (ver comentário do filtro "Até" da
 * folha de ponto).
 */
export function brazilTimeToUtcDate(
  dayUtcMidnight: Date,
  hhmm: string,
): Date {
  const [h, m] = hhmm.split(':').map(Number);

  return new Date(
    Date.UTC(
      dayUtcMidnight.getUTCFullYear(),
      dayUtcMidnight.getUTCMonth(),
      dayUtcMidnight.getUTCDate(),
      h + 3,
      m,
      0,
      0,
    ),
  );
}

const WEEKDAY_ORDER: Weekday[] = [
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

/** Encontra, entre as faixas de um horário de trabalho, a que cobre o dia da semana informado. */
export function findShiftForWeekday<
  T extends { dayFrom: Weekday; dayTo: Weekday },
>(shifts: T[], weekday: Weekday): T | null {
  const from = WEEKDAY_ORDER.indexOf(weekday);

  return (
    shifts.find((shift) => {
      const start = WEEKDAY_ORDER.indexOf(shift.dayFrom);
      const end = WEEKDAY_ORDER.indexOf(shift.dayTo);

      return start !== -1 && end !== -1 && start <= from && from <= end;
    }) ?? null
  );
}

/**
 * Soma os minutos trabalhados juntando as batidas em pares
 * entrada/saída, na ordem em que aconteceram. Uma batida sobrando no
 * fim (esqueceu de bater a saída) é ignorada no total. Usada só
 * quando não há horário de trabalho cadastrado pro dia (fallback).
 */
export function calculateWorkedMinutes(
  timestamps: Date[],
): number {
  const sorted = [...timestamps].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  let minutes = 0;

  for (let i = 0; i + 1 < sorted.length; i += 2) {
    minutes += Math.max(
      0,
      Math.round(
        (sorted[i + 1].getTime() - sorted[i].getTime()) / 60000,
      ),
    );
  }

  return minutes;
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);

  return h * 60 + m;
}

function diffMinutes(from: Date, to: Date): number {
  return Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 60000),
  );
}

export interface DaySlots {
  start: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  end: Date | null;
}

export interface DayCalculation {
  slots: DaySlots;
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  compensatedMinutes: number;
  hasSchedule: boolean;
}

export interface ShiftLike {
  startTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  endTime: string;
  lunchBreakMinutes: number | null;
}

/**
 * Calcula os horários do dia (Início/Início Intervalo/Fim
 * Intervalo/Saída) e os minutos trabalhados/esperados/extras/
 * compensados, a partir das batidas do dia e da faixa de horário de
 * trabalho cadastrada pro dia da semana (se houver).
 *
 * Só as 4 primeiras batidas do dia entram no cálculo (decisão do
 * usuário — "considerar somente a 4ª batida como final pro
 * cálculo"). Sem horário cadastrado pro dia (ex.: bateu ponto num
 * sábado fora de qualquer faixa), todas as batidas do dia contam
 * como hora extra.
 */
export function calculateDay(
  timestamps: Date[],
  shift: ShiftLike | null,
): DayCalculation {
  const sorted = [...timestamps].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  if (!shift) {
    const worked = calculateWorkedMinutes(sorted);

    return {
      slots: {
        start: sorted[0] ?? null,
        breakStart: null,
        breakEnd: null,
        end:
          sorted.length >= 2 ? sorted[sorted.length - 1] : null,
      },
      workedMinutes: worked,
      expectedMinutes: 0,
      extraMinutes: worked,
      compensatedMinutes: 0,
      hasSchedule: false,
    };
  }

  const hasBreakClock = !!(shift.breakStart && shift.breakEnd);
  const slotCount = hasBreakClock ? 4 : 2;
  const used = sorted.slice(0, slotCount);

  const slots: DaySlots = hasBreakClock
    ? {
        start: used[0] ?? null,
        breakStart: used[1] ?? null,
        breakEnd: used[2] ?? null,
        end: used[3] ?? null,
      }
    : {
        start: used[0] ?? null,
        breakStart: null,
        breakEnd: null,
        end: used[1] ?? null,
      };

  let workedMinutes = 0;

  if (hasBreakClock) {
    if (slots.start && slots.breakStart) {
      workedMinutes += diffMinutes(slots.start, slots.breakStart);
    }

    if (slots.breakEnd && slots.end) {
      workedMinutes += diffMinutes(slots.breakEnd, slots.end);
    }
  } else if (slots.start && slots.end) {
    workedMinutes = Math.max(
      0,
      diffMinutes(slots.start, slots.end) -
        (shift.lunchBreakMinutes ?? 0),
    );
  }

  const expectedMinutes = hasBreakClock
    ? Math.max(
        0,
        parseTimeToMinutes(shift.breakStart!) -
          parseTimeToMinutes(shift.startTime),
      ) +
      Math.max(
        0,
        parseTimeToMinutes(shift.endTime) -
          parseTimeToMinutes(shift.breakEnd!),
      )
    : Math.max(
        0,
        parseTimeToMinutes(shift.endTime) -
          parseTimeToMinutes(shift.startTime) -
          (shift.lunchBreakMinutes ?? 0),
      );

  const saldo = workedMinutes - expectedMinutes;

  return {
    slots,
    workedMinutes,
    expectedMinutes,
    extraMinutes: Math.max(0, saldo),
    compensatedMinutes: Math.max(0, -saldo),
    hasSchedule: true,
  };
}
