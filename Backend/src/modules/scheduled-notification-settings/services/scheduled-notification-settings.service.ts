import { Injectable } from '@nestjs/common';

import { ScheduledNotificationSettingsRepository } from '../repositories/scheduled-notification-settings.repository';

import { UpsertScheduledNotificationSettingsDto } from '../dto/upsert-scheduled-notification-settings.dto';

@Injectable()
export class ScheduledNotificationSettingsService {
  constructor(
    private readonly repository: ScheduledNotificationSettingsRepository,
  ) {}

  async getSettings(companyId: string) {
    return this.repository.getOrCreate(companyId);
  }

  /** Pra `ScheduledNotificationsService`, que roda pra todas as empresas juntas. */
  async findManyByCompanyIds(companyIds: string[]) {
    return this.repository.findManyByCompanyIds(companyIds);
  }

  async updateSettings(
    companyId: string,
    dto: UpsertScheduledNotificationSettingsDto,
  ) {
    return this.repository.upsert(companyId, dto);
  }
}
