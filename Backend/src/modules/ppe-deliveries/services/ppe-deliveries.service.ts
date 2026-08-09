import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { PpeDeliveriesRepository } from '../repositories/ppe-deliveries.repository';

import { CreatePpeDeliveryDto } from '../dto/create-ppe-delivery.dto';
import { PpeDeliveryFilterDto } from '../dto/ppe-delivery-filter.dto';

@Injectable()
export class PpeDeliveriesService {
  constructor(
    private readonly repository: PpeDeliveriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, dto: CreatePpeDeliveryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId },
    });

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    const ppeType = await this.prisma.ppeType.findFirst({
      where: { id: dto.ppeTypeId, companyId },
    });

    if (!ppeType) {
      throw new NotFoundException(
        'Tipo de EPI não encontrado.',
      );
    }

    return this.repository.create(companyId, dto);
  }

  async findAll(
    companyId: string,
    filter: PpeDeliveryFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const delivery = await this.repository.findById(
      companyId,
      id,
    );

    if (!delivery) {
      throw new NotFoundException(
        'Entrega de EPI não encontrada.',
      );
    }

    return delivery;
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }
}
