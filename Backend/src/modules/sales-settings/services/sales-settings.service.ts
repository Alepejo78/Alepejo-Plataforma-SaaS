import { BadRequestException, Injectable } from '@nestjs/common';

import { SalesSettingsRepository } from '../repositories/sales-settings.repository';

import { UpsertSalesSettingsDto } from '../dto/upsert-sales-settings.dto';

@Injectable()
export class SalesSettingsService {
  constructor(private readonly repository: SalesSettingsRepository) {}

  async getSettings(companyId: string) {
    return this.repository.getOrCreate(companyId);
  }

  async updateSettings(companyId: string, dto: UpsertSalesSettingsDto) {
    const current = await this.repository.getOrCreate(companyId);

    const maxInstallments =
      dto.maxInstallments ?? current.maxInstallments;
    const interestFreeInstallments =
      dto.interestFreeInstallments ?? current.interestFreeInstallments;

    if (interestFreeInstallments > maxInstallments) {
      throw new BadRequestException(
        'As parcelas sem juros não podem passar do máximo de parcelas.',
      );
    }

    return this.repository.upsert(companyId, dto);
  }
}
