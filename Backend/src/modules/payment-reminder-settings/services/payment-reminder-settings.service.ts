import { Injectable } from '@nestjs/common';

import { PaymentReminderSettingsRepository } from '../repositories/payment-reminder-settings.repository';

import { UpsertPaymentReminderSettingsDto } from '../dto/upsert-payment-reminder-settings.dto';

@Injectable()
export class PaymentReminderSettingsService {
  constructor(private readonly repository: PaymentReminderSettingsRepository) {}

  async getSettings(companyId: string) {
    return this.repository.getOrCreate(companyId);
  }

  async updateSettings(
    companyId: string,
    dto: UpsertPaymentReminderSettingsDto,
  ) {
    return this.repository.upsert(companyId, dto);
  }
}
