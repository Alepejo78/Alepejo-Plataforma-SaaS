import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { EmployeesRepository } from '../repositories/employees.repository';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeFilterDto } from '../dto/employee-filter.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  private handleUniqueCpf(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictException(
        'Já existe um colaborador cadastrado com este CPF.',
      );
    }

    throw err;
  }

  async create(companyId: string, dto: CreateEmployeeDto) {
    try {
      return await this.repository.create(companyId, dto);
    } catch (err) {
      this.handleUniqueCpf(err);
    }
  }

  async findAll(companyId: string, filter: EmployeeFilterDto) {
    return this.repository.findAll(companyId, filter);
  }

  async findOne(companyId: string, id: string) {
    const employee = await this.repository.findById(
      companyId,
      id,
    );

    if (!employee) {
      throw new NotFoundException(
        'Colaborador não encontrado.',
      );
    }

    return employee;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmployeeDto,
  ) {
    await this.findOne(companyId, id);

    try {
      return await this.repository.update(id, dto);
    } catch (err) {
      this.handleUniqueCpf(err);
    }
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.repository.delete(id);
  }
}
