import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  
  import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
  import { UserRoleFilterDto } from '../dto/user-role-filter.dto';
  import { UserRolesRepository } from '../repositories/user-roles.repository';
  
  @Injectable()
  export class UserRolesService {
    constructor(
      private readonly repository: UserRolesRepository,
    ) {}
  
    async assign(
      dto: AssignUserRoleDto,
    ) {
      const exists =
        await this.repository.findByUserAndRole(
          dto.userId,
          dto.roleId,
        );
  
      if (exists) {
        throw new BadRequestException(
          'Este papel já está vinculado ao usuário.',
        );
      }
  
      return this.repository.create({
        user: {
          connect: {
            id: dto.userId,
          },
        },
        role: {
          connect: {
            id: dto.roleId,
          },
        },
      });
    }
  
    async findAll(
      filter: UserRoleFilterDto,
    ) {
      return this.repository.findAll(filter);
    }
  
    async findById(
      id: string,
    ) {
      const userRole =
        await this.repository.findById(id);
  
      if (!userRole) {
        throw new NotFoundException(
          'Vínculo entre usuário e papel não encontrado.',
        );
      }
  
      return userRole;
    }
  
    async remove(
      id: string,
    ) {
      await this.findById(id);
  
      return this.repository.delete(id);
    }
  }