import { Injectable } from '@nestjs/common';
import { Prisma, PpeDelivery } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

const includeRelations = {
  ppeType: true,
  employee: {
    select: {
      id: true,
      name: true,
      rg: true,
      cpf: true,
      workCard: true,
      workCardSeries: true,
      jobFunction: {
        select: {
          id: true,
          name: true,
          sector: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.PpeDeliveryInclude;

@Injectable()
export class PpeDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    dto: CreatePpeDeliveryDto,
  ): Promise<PpeDelivery> {
    return this.prisma.ppeDelivery.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        ppeTypeId: dto.ppeTypeId,
        ca: dto.ca,
        quantity: dto.quantity ?? 1,
        deliveryDate: dto.deliveryDate
          ? new Date(dto.deliveryDate)
          : undefined,
        observation: dto.observation,
      },
      include: includeRelations,
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<PpeDelivery | null> {
    return this.prisma.ppeDelivery.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: PpeDeliveryFilterDto,
  ) {
    const { employeeId, limit } = filter;

    return this.prisma.ppeDelivery.findMany({
      where: {
        companyId,
        ...(employeeId && { employeeId }),
      },
      include: includeRelations,
      take: limit,
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async delete(id: string): Promise<PpeDelivery> {
    return this.prisma.ppeDelivery.delete({
      where: { id },
    });
  }
}
