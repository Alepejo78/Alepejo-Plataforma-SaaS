import {
    BadRequestException,
    ForbiddenException,
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
      companyId: string,
      dto: AssignRolePermissionDto,
    ) {
      const roleBelongsToCompany =
        await this.repository.roleBelongsToCompany(
          companyId,
          dto.roleId,
        );

      if (!roleBelongsToCompany) {
        throw new ForbiddenException(
          'Este papel não pertence à sua empresa.',
        );
      }

      const exists =
        await this.repository.findByRoleAndPermission(
          companyId,
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
      companyId: string,
      filter: RolePermissionFilterDto,
    ) {
      return this.repository.findAll(companyId, filter);
    }

    async findById(
      companyId: string,
      id: string,
    ) {
      const rolePermission =
        await this.repository.findById(companyId, id);

      if (!rolePermission) {
        throw new NotFoundException(
          'Vínculo entre papel e permissão não encontrado.',
        );
      }

      return rolePermission;
    }

    async updateEffect(
      companyId: string,
      id: string,
      effect: PermissionEffect,
    ) {
      await this.findById(companyId, id);

      return this.repository.update(id, {
        effect,
      });
    }

    async remove(
      companyId: string,
      id: string,
    ) {
      await this.findById(companyId, id);

      return this.repository.delete(id);
    }
  }
