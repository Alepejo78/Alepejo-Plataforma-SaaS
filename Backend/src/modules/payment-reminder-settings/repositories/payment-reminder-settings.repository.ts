import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { UpsertPaymentReminderSettingsDto } from '../dto/upsert-payment-reminder-settings.dto';

@Injectable()
export class PaymentReminderSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(companyId: string) {
    const existing = await this.prisma.paymentReminderSettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.paymentReminderSettings.create({
      data: { companyId },
    });
  }

  async upsert(companyId: string, dto: UpsertPaymentReminderSettingsDto) {
    return this.prisma.paymentReminderSettings.upsert({
      where: { companyId },
      update: {
        ...(dto.daysBeforeDue !== undefined && {
          daysBeforeDue: dto.daysBeforeDue,
        }),
        ...(dto.daysAfterDue !== undefined && {
          daysAfterDue: dto.daysAfterDue,
        }),
      },
      create: {
        companyId,
        daysBeforeDue: dto.daysBeforeDue,
        daysAfterDue: dto.daysAfterDue,
      },
    });
  }
}
