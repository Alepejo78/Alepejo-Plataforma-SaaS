import { Injectable } from '@nestjs/common';

import { PayrollSettingsRepository } from '../repositories/payroll-settings.repository';

import { UpdatePayrollSettingsDto } from '../dto/update-payroll-settings.dto';

@Injectable()
export class PayrollSettingsService {
  constructor(private readonly repository: PayrollSettingsRepository) {}

  async find(companyId: string) {
    return this.repository.getOrCreate(companyId);
  }

  async update(companyId: string, dto: UpdatePayrollSettingsDto) {
    return this.repository.update(companyId, dto);
  }
}
