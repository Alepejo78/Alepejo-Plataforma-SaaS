import {
    BadRequestException,
    ForbiddenException,
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
      companyId: string,
      dto: AssignUserRoleDto,
    ) {
      const [userOk, roleOk] = await Promise.all([
        this.repository.userBelongsToCompany(companyId, dto.userId),
        this.repository.roleBelongsToCompany(companyId, dto.roleId),
      ]);

      if (!userOk || !roleOk) {
        throw new ForbiddenException(
          'Usuário ou papel não pertencem à sua empresa.',
        );
      }

      const exists =
        await this.repository.findByUserAndRole(
          companyId,
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
      companyId: string,
      filter: UserRoleFilterDto,
    ) {
      return this.repository.findAll(companyId, filter);
    }

    async findById(
      companyId: string,
      id: string,
    ) {
      const userRole =
        await this.repository.findById(companyId, id);

      if (!userRole) {
        throw new NotFoundException(
          'Vínculo entre usuário e papel não encontrado.',
        );
      }

      return userRole;
    }

    async remove(
      companyId: string,
      id: string,
    ) {
      await this.findById(companyId, id);

      return this.repository.delete(id);
    }
  }
