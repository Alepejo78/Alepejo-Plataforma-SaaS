
import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { Role } from '@prisma/client';
  
  import { RolesRepository } from '../repositories/roles.repository';
  import { CreateRoleDto } from '../dto/create-role.dto';
  import { UpdateRoleDto } from '../dto/update-role.dto';
  import { RoleFilterDto } from '../dto/role-filter.dto';
  
  @Injectable()
  export class RolesService {
    constructor(
      private readonly repository: RolesRepository,
    ) {}
  
    async create(
      dto: CreateRoleDto,
      companyId: string,
      userId: string,
    ): Promise<Role> {
      const roleByCode = await this.repository.findByCode(
        companyId,
        dto.code,
      );
  
      if (roleByCode) {
        throw new BadRequestException(
          'Já existe uma Role cadastrada com este código.',
        );
      }
  
      const roleByName = await this.repository.findByName(
        companyId,
        dto.name,
      );
  
      if (roleByName) {
        throw new BadRequestException(
          'Já existe uma Role cadastrada com este nome.',
        );
      }
  
      return this.repository.create({
        company: {
          connect: {
            id: companyId,
          },
        },
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active ?? true,
      });
    }
  
    async findAll(
      filter: RoleFilterDto,
      companyId: string,
    ) {
      return this.repository.findAll(
        filter,
        companyId,
      );
    }
  
    async findById(
      id: string,
      companyId: string,
    ) {
      const role = await this.repository.findById(
        id,
        companyId,
      );
  
      if (!role) {
        throw new NotFoundException(
          'Role não encontrada.',
        );
      }
  
      return role;
    }
  
    async update(
      id: string,
      dto: UpdateRoleDto,
      companyId: string,
      userId: string,
    ) {
      const role = await this.findById(
        id,
        companyId,
      );
  
      if (
        dto.code &&
        dto.code !== role.code
      ) {
        const exists = await this.repository.findByCode(
          companyId,
          dto.code,
        );
  
        if (exists) {
          throw new BadRequestException(
            'Já existe uma Role cadastrada com este código.',
          );
        }
      }
  
      if (
        dto.name &&
        dto.name !== role.name
      ) {
        const exists = await this.repository.findByName(
          companyId,
          dto.name,
        );
  
        if (exists) {
          throw new BadRequestException(
            'Já existe uma Role cadastrada com este nome.',
          );
        }
      }
  
      return this.repository.update(id, {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      });
    }
  
    async remove(
      id: string,
      companyId: string,
    ) {
      await this.findById(
        id,
        companyId,
      );
  
      return this.repository.softDelete(id);
    }
  }