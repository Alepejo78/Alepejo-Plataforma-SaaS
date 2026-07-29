import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PermissionEffect } from '@prisma/client';
  
  import { AssignRolePermissionDto } from '../dto/assign-role-permission.dto';
  import { RolePermissionFilterDto } from '../dto/role-permission-filter.dto';
  import { RolePermissionsRepository } from '../repositories/role-permissions.repository';
  
  @Injectable()
  export class RolePermissionsService {
    constructor(
      private readonly repository: RolePermissionsRepository,
    ) {}
  
    async assign(
      dto: AssignRolePermissionDto,
    ) {
      const exists =
        await this.repository.findByRoleAndPermission(
          dto.roleId,
          dto.permissionId,
        );
  
      if (exists) {
        throw new BadRequestException(
          'Esta permissão já está vinculada ao papel informado.',
        );
      }
  
      return this.repository.create({
        role: {
          connect: {
            id: dto.roleId,
          },
        },
        permission: {
          connect: {
            id: dto.permissionId,
          },
        },
        effect: dto.effect ?? PermissionEffect.ALLOW,
      });
    }
  
    async findAll(
      filter: RolePermissionFilterDto,
    ) {
      return this.repository.findAll(filter);
    }
  
    async findById(
      id: string,
    ) {
      const rolePermission =
        await this.repository.findById(id);
  
      if (!rolePermission) {
        throw new NotFoundException(
          'Vínculo entre papel e permissão não encontrado.',
        );
      }
  
      return rolePermission;
    }
  
    async updateEffect(
      id: string,
      effect: PermissionEffect,
    ) {
      await this.findById(id);
  
      return this.repository.update(id, {
        effect,
      });
    }
  
    async remove(
      id: string,
    ) {
      await this.findById(id);
  
      return this.repository.delete(id);
    }
  }