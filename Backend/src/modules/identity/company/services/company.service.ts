import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Company } from '@prisma/client';

import { CompanyRepository } from '../repositories/company.repository';

import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const companyExists = await this.companyRepository.findByDocument(
      dto.document,
    );

    if (companyExists) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento.',
      );
    }

    return this.companyRepository.create(dto);
  }

  async findAll(page = 1, limit = 20) {
    return this.companyRepository.findAll(page, limit);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    return company;
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    await this.findById(id);

    return this.companyRepository.update(id, dto);
  }

  async remove(id: string): Promise<Company> {
    await this.findById(id);

    return this.companyRepository.softDelete(id);
  }
}