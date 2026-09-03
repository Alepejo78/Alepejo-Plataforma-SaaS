import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { UpsertSalesSettingsDto } from '../dto/upsert-sales-settings.dto';

@Injectable()
export class SalesSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(companyId: string) {
    const existing = await this.prisma.salesSettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.salesSettings.create({
      data: { companyId },
    });
  }

  async upsert(companyId: string, dto: UpsertSalesSettingsDto) {
    return this.prisma.salesSettings.upsert({
      where: { companyId },
      update: {
        ...(dto.maxInstallments !== undefined && {
          maxInstallments: dto.maxInstallments,
        }),
        ...(dto.interestFreeInstallments !== undefined && {
          interestFreeInstallments: dto.interestFreeInstallments,
        }),
        ...(dto.interestRatePerInstallment !== undefined && {
          interestRatePerInstallment: dto.interestRatePerInstallment,
        }),
      },
      create: {
        companyId,
        maxInstallments: dto.maxInstallments,
        interestFreeInstallments: dto.interestFreeInstallments,
        interestRatePerInstallment: dto.interestRatePerInstallment,
      },
    });
  }
}
