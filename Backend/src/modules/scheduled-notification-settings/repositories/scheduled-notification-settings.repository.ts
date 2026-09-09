import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { UpsertScheduledNotificationSettingsDto } from '../dto/upsert-scheduled-notification-settings.dto';

const FIELDS = [
  'announcementHeader',
  'announcementFooter',
  'examReminderSubject',
  'examReminderMessage',
  'birthdaySubject',
  'birthdayMessage',
  'hourBankClosingSubject',
  'hourBankClosingMessage',
  'pointClosingSubject',
  'pointClosingMessage',
  'paymentReminderBeforeSubject',
  'paymentReminderBeforeMessage',
  'paymentReminderOverdueSubject',
  'paymentReminderOverdueMessage',
] as const;

/** Campo em branco = "usar o texto padrão do sistema" — grava `null`, não string vazia, pra `ScheduledNotificationsService` conseguir usar `??` direto. */
function normalize(dto: UpsertScheduledNotificationSettingsDto) {
  const data: Record<string, string | null> = {};

  for (const field of FIELDS) {
    const value = dto[field];

    if (value !== undefined) {
      const trimmed = value.trim();
      data[field] = trimmed.length > 0 ? trimmed : null;
    }
  }

  return data;
}

@Injectable()
export class ScheduledNotificationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Pra `ScheduledNotificationsService`, que roda pra todas as empresas juntas — evita 1 query por empresa dentro do laço. */
  async findManyByCompanyIds(companyIds: string[]) {
    return this.prisma.scheduledNotificationSettings.findMany({
      where: { companyId: { in: companyIds } },
    });
  }

  async getOrCreate(companyId: string) {
    const existing =
      await this.prisma.scheduledNotificationSettings.findUnique({
        where: { companyId },
      });

    if (existing) {
      return existing;
    }

    return this.prisma.scheduledNotificationSettings.create({
      data: { companyId },
    });
  }

  async upsert(
    companyId: string,
    dto: UpsertScheduledNotificationSettingsDto,
  ) {
    const data = normalize(dto);

    return this.prisma.scheduledNotificationSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }
}
