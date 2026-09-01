import { Injectable } from '@nestjs/common';
import { Prisma, PpeDelivery, PpeDeliveryStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

const includeRelations = {
  ppeType: true,
  company: {
    select: {
      id: true,
      tradeName: true,
      legalName: true,
      logo: true,
      brandingLogoLightEnabled: true,
    },
  },
  employee: {
    select: {
      id: true,
      name: true,
      rg: true,
      cpf: true,
      email: true,
      mobile: true,
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

export type PpeDeliveryWithRelations = Prisma.PpeDeliveryGetPayload<{
  include: typeof includeRelations;
}>;

@Injectable()
export class PpeDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    dto: CreatePpeDeliveryDto,
  ): Promise<PpeDeliveryWithRelations> {
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
  ): Promise<PpeDeliveryWithRelations | null> {
    return this.prisma.ppeDelivery.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  /** Sem escopo de empresa — só pra checagem de token nas rotas públicas. */
  async findByIdUnscoped(id: string): Promise<PpeDeliveryWithRelations | null> {
    return this.prisma.ppeDelivery.findUnique({
      where: { id },
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

  async setConfirmationToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.ppeDelivery.update({
      where: { id },
      data: {
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
      },
    });
  }

  /** Confirmação manual, feita por alguém do RH logado na tela. */
  async confirm(id: string, confirmedById: string): Promise<PpeDeliveryWithRelations> {
    return this.prisma.ppeDelivery.update({
      where: { id },
      data: {
        status: PpeDeliveryStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById,
      },
      include: includeRelations,
    });
  }

  /** Confirmação pública, feita pelo próprio colaborador via link — sem usuário logado, e zera o token (uso único). */
  async confirmByToken(id: string): Promise<PpeDeliveryWithRelations> {
    return this.prisma.ppeDelivery.update({
      where: { id },
      data: {
        status: PpeDeliveryStatus.CONFIRMADO,
        confirmedAt: new Date(),
        confirmedById: null,
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
      },
      include: includeRelations,
    });
  }
}
