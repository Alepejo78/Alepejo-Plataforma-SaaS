import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TimeEntrySource } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { TimeEntryRepository } from '../repositories/time-entry.repository';
import { TimeSheetApprovalRepository } from '../repositories/time-sheet-approval.repository';
import { TimeEntryAdjustmentRepository } from '../repositories/time-entry-adjustment.repository';

import { CreateTimeEntryDto } from '../dto/create-time-entry.dto';
import { TimeEntryFilterDto } from '../dto/time-entry-filter.dto';
import { DayActionDto } from '../dto/day-action.dto';
import { AdjustDayDto } from '../dto/adjust-day.dto';
import { SelfReportDayDto } from '../dto/self-report-day.dto';

import {
  brazilTimeToUtcDate,
  calculateDay,
  findShiftForWeekday,
  jsDayToWeekday,
  utcMidnight,
  type DaySlots,
} from '../utils/time-entry.util';

export interface DaySummary {
  employeeId: string;
  employeeName: string;
  date: string;
  entries: {
    id: string;
    timestamp: Date;
    source: string;
    observation: string | null;
  }[];
  slots: {
    start: Date | null;
    breakStart: Date | null;
    breakEnd: Date | null;
    end: Date | null;
  };
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  compensatedMinutes: number;
  hasSchedule: boolean;
  hasAdjustment: boolean;
  selfReported: boolean;
  status: 'PENDING' | 'APPROVED';
  approvedAt?: Date;
}

function dayRange(date: Date) {
  const start = utcMidnight(date);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  return { start, end };
}

@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly entryRepository: TimeEntryRepository,
    private readonly approvalRepository: TimeSheetApprovalRepository,
    private readonly adjustmentRepository: TimeEntryAdjustmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createEntry(companyId: string, dto: CreateTimeEntryDto) {
    // `employeeId` aceita o id interno OU o código de crachá
    // (Employee.badgeCode) — é o que dá pra codificar num QR/código
    // de barras curto, em vez de obrigar o id (cuid) inteiro.
    const employee = await this.prisma.employee.findFirst({
      where: {
        companyId,
        active: true,
        OR: [
          { id: dto.employeeId },
          { badgeCode: dto.employeeId },
        ],
      },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado ou inativo.',
      );
    }

    const timestamp = dto.timestamp
      ? new Date(dto.timestamp)
      : new Date();

    const day = utcMidnight(timestamp);

    const approved = await this.approvalRepository.find(
      companyId,
      employee.id,
      day,
    );

    if (approved) {
      throw new BadRequestException(
        'Este dia já foi aprovado — reabra antes de registrar novas batidas.',
      );
    }

    return this.entryRepository.create(companyId, {
      employeeId: employee.id,
      timestamp,
      source: dto.source,
      observation: dto.observation,
    });
  }

  async deleteEntry(companyId: string, id: string) {
    const entry = await this.entryRepository.findById(
      companyId,
      id,
    );

    if (!entry) {
      throw new NotFoundException('Batida não encontrada.');
    }

    const day = utcMidnight(entry.timestamp);

    const approved = await this.approvalRepository.find(
      companyId,
      entry.employeeId,
      day,
    );

    if (approved) {
      throw new BadRequestException(
        'Este dia já foi aprovado — reabra antes de excluir batidas.',
      );
    }

    await this.entryRepository.delete(id);
  }

  async getDaySummaries(
    companyId: string,
    filter: TimeEntryFilterDto,
  ): Promise<DaySummary[]> {
    const from = filter.from ? new Date(filter.from) : undefined;
    // "Até" é uma data de calendário (AAAA-MM-DD) — sem levar até o
    // fim do dia, o filtro corta em meia-noite UTC, excluindo
    // qualquer batida feita à tarde/noite no fuso do Brasil (UTC-3).
    const to = filter.to
      ? new Date(
          new Date(filter.to).getTime() +
            24 * 60 * 60 * 1000 -
            1,
        )
      : undefined;

    const [entries, approvals, adjustments] = await Promise.all([
      this.entryRepository.findAll(companyId, {
        employeeId: filter.employeeId,
        from,
        to,
      }),
      this.approvalRepository.findAll(companyId, {
        employeeId: filter.employeeId,
        from,
        to,
      }),
      this.adjustmentRepository.findAll(companyId, {
        employeeId: filter.employeeId,
        from,
        to,
      }),
    ]);

    const approvalMap = new Map(
      approvals.map((a) => [
        `${a.employeeId}_${a.date.toISOString()}`,
        a,
      ]),
    );

    const adjustedKeys = new Set(
      adjustments.map(
        (a) => `${a.employeeId}_${a.date.toISOString()}`,
      ),
    );

    const groups = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        workScheduleId: string | null;
        date: Date;
        entries: typeof entries;
      }
    >();

    for (const entry of entries) {
      const day = utcMidnight(entry.timestamp);
      const key = `${entry.employeeId}_${day.toISOString()}`;

      if (!groups.has(key)) {
        groups.set(key, {
          employeeId: entry.employeeId,
          employeeName: entry.employee.name,
          workScheduleId: entry.employee.workScheduleId,
          date: day,
          entries: [],
        });
      }

      groups.get(key)!.entries.push(entry);
    }

    const scheduleIds = Array.from(
      new Set(
        Array.from(groups.values())
          .map((g) => g.workScheduleId)
          .filter((id): id is string => !!id),
      ),
    );

    const shifts = scheduleIds.length
      ? await this.prisma.workScheduleShift.findMany({
          where: { workScheduleId: { in: scheduleIds } },
        })
      : [];

    const shiftsBySchedule = new Map<string, typeof shifts>();

    for (const shift of shifts) {
      const list = shiftsBySchedule.get(shift.workScheduleId) ?? [];

      list.push(shift);
      shiftsBySchedule.set(shift.workScheduleId, list);
    }

    return Array.from(groups.values())
      .map((group) => {
        const key = `${group.employeeId}_${group.date.toISOString()}`;
        const approval = approvalMap.get(key);

        const weekday = jsDayToWeekday(group.date.getUTCDay());
        const scheduleShifts = group.workScheduleId
          ? (shiftsBySchedule.get(group.workScheduleId) ?? [])
          : [];
        const shift = findShiftForWeekday(scheduleShifts, weekday);

        const calc = calculateDay(
          group.entries.map((e) => e.timestamp),
          shift,
        );

        return {
          employeeId: group.employeeId,
          employeeName: group.employeeName,
          date: group.date.toISOString().slice(0, 10),
          entries: group.entries.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            source: e.source,
            observation: e.observation,
          })),
          slots: calc.slots,
          workedMinutes: approval
            ? approval.workedMinutes
            : calc.workedMinutes,
          expectedMinutes: calc.expectedMinutes,
          extraMinutes: calc.extraMinutes,
          compensatedMinutes: calc.compensatedMinutes,
          hasSchedule: calc.hasSchedule,
          hasAdjustment: adjustedKeys.has(key),
          selfReported:
            group.entries.length > 0 &&
            group.entries.every(
              (e) => e.source === TimeEntrySource.AUTOLANCAMENTO,
            ),
          status: approval
            ? ('APPROVED' as const)
            : ('PENDING' as const),
          approvedAt: approval?.createdAt,
        };
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          a.employeeName.localeCompare(b.employeeName),
      );
  }

  async approveDay(
    companyId: string,
    approvedByUserId: string,
    dto: DayActionDto,
  ) {
    const day = utcMidnight(new Date(dto.date));
    const { start, end } = dayRange(day);

    const [entries, employee] = await Promise.all([
      this.entryRepository.findAll(companyId, {
        employeeId: dto.employeeId,
        from: start,
        to: end,
      }),
      this.prisma.employee.findFirst({
        where: { id: dto.employeeId, companyId },
        select: { workScheduleId: true },
      }),
    ]);

    if (entries.length === 0) {
      throw new BadRequestException(
        'Nenhuma batida registrada neste dia.',
      );
    }

    const shift = employee?.workScheduleId
      ? findShiftForWeekday(
          await this.prisma.workScheduleShift.findMany({
            where: { workScheduleId: employee.workScheduleId },
          }),
          jsDayToWeekday(day.getUTCDay()),
        )
      : null;

    const calc = calculateDay(
      entries.map((e) => e.timestamp),
      shift,
    );

    return this.approvalRepository.upsert(
      companyId,
      dto.employeeId,
      day,
      calc.workedMinutes,
      approvedByUserId,
    );
  }

  async reopenDay(companyId: string, dto: DayActionDto) {
    const day = utcMidnight(new Date(dto.date));

    await this.approvalRepository.delete(
      companyId,
      dto.employeeId,
      day,
    );
  }

  /**
   * Ajuste manual do dia (subtela "Ajustar") — substitui as batidas
   * do dia pelos 4 horários informados (Início/Início Intervalo/Fim
   * Intervalo/Saída), gravando antes/depois + justificativa na
   * auditoria (`TimeEntryAdjustment`). Só permitido se o dia ainda
   * não foi aprovado.
   */
  async adjustDay(
    companyId: string,
    adjustedByUserId: string,
    dto: AdjustDayDto,
  ) {
    const day = utcMidnight(new Date(dto.date));
    const { start, end } = dayRange(day);

    const approved = await this.approvalRepository.find(
      companyId,
      dto.employeeId,
      day,
    );

    if (approved) {
      throw new BadRequestException(
        'Este dia já foi aprovado — reabra antes de ajustar.',
      );
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado.');
    }

    const currentEntries = await this.entryRepository.findAll(
      companyId,
      { employeeId: dto.employeeId, from: start, to: end },
    );

    const shift = employee.workScheduleId
      ? findShiftForWeekday(
          await this.prisma.workScheduleShift.findMany({
            where: { workScheduleId: employee.workScheduleId },
          }),
          jsDayToWeekday(day.getUTCDay()),
        )
      : null;

    const before = calculateDay(
      currentEntries.map((e) => e.timestamp),
      shift,
    ).slots;

    const timeToDate = (time?: string) =>
      time ? brazilTimeToUtcDate(day, time) : null;

    const after: DaySlots = {
      start: timeToDate(dto.start),
      breakStart: timeToDate(dto.breakStart),
      breakEnd: timeToDate(dto.breakEnd),
      end: timeToDate(dto.end),
    };

    await this.adjustmentRepository.create(
      companyId,
      dto.employeeId,
      day,
      before,
      after,
      dto.justification,
      adjustedByUserId,
    );

    await this.entryRepository.deleteForDay(
      companyId,
      dto.employeeId,
      start,
      end,
    );

    const newEntries = (
      [after.start, after.breakStart, after.breakEnd, after.end] as (
        | Date
        | null
      )[]
    ).filter((value): value is Date => value !== null);

    await this.entryRepository.createMany(
      companyId,
      dto.employeeId,
      newEntries.map((timestamp) => ({
        timestamp,
        source: TimeEntrySource.AJUSTE,
      })),
    );
  }

  /**
   * Desfaz um ajuste manual: restaura as batidas do dia pros valores
   * `before*` gravados na auditoria (mesma mecânica de `adjustDay` —
   * apaga as batidas atuais e recria a partir do snapshot) e remove o
   * registro de ajuste. Só o registro de auditoria some, não é uma
   * "delete lógico" — não sobra rastro de um ajuste que foi desfeito
   * na mesma hora.
   */
  async reverseAdjustment(companyId: string, adjustmentId: string) {
    const adjustment = await this.adjustmentRepository.findOne(
      companyId,
      adjustmentId,
    );

    if (!adjustment) {
      throw new NotFoundException('Ajuste não encontrado.');
    }

    const { start, end } = dayRange(adjustment.date);

    await this.entryRepository.deleteForDay(
      companyId,
      adjustment.employeeId,
      start,
      end,
    );

    const restoredEntries = (
      [
        adjustment.beforeStart,
        adjustment.beforeBreakStart,
        adjustment.beforeBreakEnd,
        adjustment.beforeEnd,
      ] as (Date | null)[]
    ).filter((value): value is Date => value !== null);

    if (restoredEntries.length > 0) {
      await this.entryRepository.createMany(
        companyId,
        adjustment.employeeId,
        restoredEntries.map((timestamp) => ({
          timestamp,
          source: TimeEntrySource.AJUSTE,
        })),
      );
    }

    await this.adjustmentRepository.delete(adjustmentId);
  }

  /**
   * Banco de horas: acumulado de hora extra desde o último fechamento
   * (`hourBankSettledUntil`, ou a admissão se nunca fechou) até hoje —
   * mesmo cálculo usado na folha pra pagar o fechamento
   * (`PayrollService.applyHourBank`), só que projetado até a data
   * atual em vez do próximo fechamento.
   */
  async getHourBankSummary(companyId: string, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        hourBankEnabled: true,
        hourBankClosingDate: true,
        hourBankSettledUntil: true,
        admissionDate: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado.');
    }

    const today = new Date();
    const from = employee.hourBankSettledUntil ?? employee.admissionDate ?? today;

    const days = await this.getDaySummaries(companyId, {
      employeeId,
      from: from.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    });

    const accumulatedMinutes = days.reduce(
      (sum, day) => sum + day.extraMinutes - day.compensatedMinutes,
      0,
    );

    return {
      hourBankEnabled: employee.hourBankEnabled,
      hourBankClosingDate: employee.hourBankClosingDate,
      hourBankSettledUntil: employee.hourBankSettledUntil,
      accumulatedMinutes,
    };
  }

  /**
   * Autolançamento (tela "Ponto - Manual", menu do avatar) — o
   * próprio colaborador lança o dia inteiro (4 horários, todos
   * obrigatórios) quando esqueceu de bater ponto. Sempre lança em
   * nome do colaborador vinculado ao usuário logado (`Employee.userId`)
   * — nunca aceita `employeeId` do cliente, pra não dar brecha de
   * lançar em nome de outro colaborador.
   */
  async selfReportDay(
    companyId: string,
    userId: string,
    dto: SelfReportDayDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, userId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Seu usuário ainda não está vinculado a um colaborador — peça pro RH vincular no seu cadastro.',
      );
    }

    const day = utcMidnight(new Date(dto.date));
    const { start, end } = dayRange(day);

    const approved = await this.approvalRepository.find(
      companyId,
      employee.id,
      day,
    );

    if (approved) {
      throw new BadRequestException(
        'Este dia já foi aprovado.',
      );
    }

    const existing = await this.entryRepository.findAll(
      companyId,
      { employeeId: employee.id, from: start, to: end },
    );

    if (existing.length > 0) {
      throw new BadRequestException(
        'Já existem batidas registradas nesse dia — fale com o RH pra corrigir.',
      );
    }

    const timestamps = [
      dto.start,
      dto.breakStart,
      dto.breakEnd,
      dto.end,
    ].map((time) => brazilTimeToUtcDate(day, time));

    await this.entryRepository.createMany(
      companyId,
      employee.id,
      timestamps.map((timestamp) => ({
        timestamp,
        source: TimeEntrySource.AUTOLANCAMENTO,
      })),
    );
  }

  async getAdjustments(
    companyId: string,
    filter: TimeEntryFilterDto,
  ) {
    const from = filter.from ? new Date(filter.from) : undefined;
    const to = filter.to
      ? new Date(
          new Date(filter.to).getTime() +
            24 * 60 * 60 * 1000 -
            1,
        )
      : undefined;

    return this.adjustmentRepository.findAll(companyId, {
      employeeId: filter.employeeId,
      from,
      to,
    });
  }
}
