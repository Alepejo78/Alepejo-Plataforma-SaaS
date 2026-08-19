import { Injectable } from '@nestjs/common';
import { PayrollSettings, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class PayrollSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompany(companyId: string): Promise<PayrollSettings | null> {
    return this.prisma.payrollSettings.findUnique({
      where: { companyId },
    });
  }

  /** Cria com os defaults do schema na primeira vez que a empresa acessa. */
  async getOrCreate(companyId: string): Promise<PayrollSettings> {
    return this.prisma.payrollSettings.upsert({
      where: { companyId },
      update: {},
      create: { companyId },
    });
  }

  async update(
    companyId: string,
    data: Omit<Prisma.PayrollSettingsUncheckedCreateInput, 'companyId'>,
  ): Promise<PayrollSettings> {
    return this.prisma.payrollSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }
}
