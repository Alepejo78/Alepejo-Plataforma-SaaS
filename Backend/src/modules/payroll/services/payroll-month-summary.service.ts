import { Injectable } from '@nestjs/common';

import { TimeTrackingService } from '../../time-tracking/services/time-tracking.service';
import { AbsenceService } from '../../time-tracking/services/absence.service';

export interface PayrollMonthSummary {
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  /** Dias distintos com pelo menos 1 minuto trabalhado — usado no cálculo de DIARISTA. */
  workedDays: number;
  /** Dias dentro da competência cujo ponto ainda não foi aprovado — bloqueia a APROVAÇÃO da folha (não a geração). */
  pendingDays: number;
  /** Dias distintos com falta injustificada aprovada no período. */
  unjustifiedAbsenceDays: number;
}

/**
 * Reaproveita 100% o cálculo de horas já existente no módulo de
 * Ponto (`TimeTrackingService.getDaySummaries` → `calculateDay()`) —
 * nenhuma lógica de jornada/hora extra é duplicada aqui, só agregada
 * pro mês inteiro da competência.
 */
@Injectable()
export class PayrollMonthSummaryService {
  constructor(
    private readonly timeTrackingService: TimeTrackingService,
    private readonly absenceService: AbsenceService,
  ) {}

  async getSummary(
    companyId: string,
    employeeId: string,
    year: number,
    month: number,
  ): Promise<PayrollMonthSummary> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [days, absences] = await Promise.all([
      this.timeTrackingService.getDaySummaries(companyId, {
        employeeId,
        from,
        to,
      }),
      this.absenceService.findAll(companyId, {
        employeeId,
        type: 'FALTA_INJUSTIFICADA',
        status: 'APROVADO',
        from,
        to,
      }),
    ]);

    const summary = days.reduce(
      (acc, day) => ({
        workedMinutes: acc.workedMinutes + day.workedMinutes,
        expectedMinutes: acc.expectedMinutes + day.expectedMinutes,
        extraMinutes: acc.extraMinutes + day.extraMinutes,
        workedDays: acc.workedDays + (day.workedMinutes > 0 ? 1 : 0),
        pendingDays: acc.pendingDays + (day.status === 'PENDING' ? 1 : 0),
      }),
      { workedMinutes: 0, expectedMinutes: 0, extraMinutes: 0, workedDays: 0, pendingDays: 0 },
    );

    const distinctAbsenceDates = new Set(
      absences.map((absence) => absence.date.toISOString().slice(0, 10)),
    );

    return {
      ...summary,
      unjustifiedAbsenceDays: distinctAbsenceDates.size,
    };
  }
}
