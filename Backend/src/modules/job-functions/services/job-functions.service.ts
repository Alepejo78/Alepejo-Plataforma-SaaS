import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { JobFunctionsRepository } from '../repositories/job-functions.repository';

import { CreateJobFunctionDto } from '../dto/create-job-function.dto';
import { UpdateJobFunctionDto } from '../dto/update-job-function.dto';
import { JobFunctionFilterDto } from '../dto/job-function-filter.dto';

@Injectable()
export class JobFunctionsService {
  constructor(
    private readonly repository: JobFunctionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /** Resolve o título oficial da ocupação a partir do código CBO informado. */
  private async resolveCboTitle(
    cboCode: string | undefined,
  ): Promise<string | undefined> {
    if (!cboCode) {
      return undefined;
    }

    const occupation = await this.prisma.cboOccupation.findUnique(
      { where: { code: cboCode } },
    );

    return occupation?.title;
  }

  async create(companyId: string, dto: CreateJobFunctionDto) {
    const exists = await this.repository.findByName(
      companyId,
      dto.name,
    );

    const cboTitle = await this.resolveCboTitle(dto.cboCode);

    if (exists) {
      if (exists.active) {
        throw new ConflictException(
          'Já existe uma função com este nome.',
        );
      }

      return this.repository.restore(exists.id, dto, cboTitle);
    }

    return this.repository.create(companyId, dto, cboTitle);
  }

  async findAll(
    companyId: string,
    filter: JobFunctionFilterDto,
  ) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const jobFunction = await this.repository.findById(
      companyId,
      id,
    );

    if (!jobFunction) {
      throw new NotFoundException('Função não encontrada.');
    }

    return jobFunction;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateJobFunctionDto,
  ) {
    await this.findOne(companyId, id);

    const cboTitle =
      dto.cboCode !== undefined
        ? await this.resolveCboTitle(dto.cboCode)
        : undefined;

    return this.repository.update(id, dto, cboTitle);
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }
}
