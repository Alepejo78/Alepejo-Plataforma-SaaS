import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { UpsertProductionSettingsDto } from '../dto/upsert-production-settings.dto';

@Injectable()
export class ProductionSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(companyId: string) {
    const existing = await this.prisma.productionSettings.findUnique(
      { where: { companyId } },
    );

    if (existing) {
      return existing;
    }

    return this.prisma.productionSettings.create({
      data: { companyId },
    });
  }

  async upsert(
    companyId: string,
    dto: UpsertProductionSettingsDto,
  ) {
    return this.prisma.productionSettings.upsert({
      where: { companyId },
      update: {
        ...(dto.minBatchSize !== undefined && {
          minBatchSize: dto.minBatchSize,
        }),
        ...(dto.autoGenerateOnSalesOrder !== undefined && {
          autoGenerateOnSalesOrder: dto.autoGenerateOnSalesOrder,
        }),
        ...(dto.autoGenerateOnLowStock !== undefined && {
          autoGenerateOnLowStock: dto.autoGenerateOnLowStock,
        }),
      },
      create: {
        companyId,
        minBatchSize: dto.minBatchSize,
        autoGenerateOnSalesOrder: dto.autoGenerateOnSalesOrder,
        autoGenerateOnLowStock: dto.autoGenerateOnLowStock,
      },
    });
  }
}
