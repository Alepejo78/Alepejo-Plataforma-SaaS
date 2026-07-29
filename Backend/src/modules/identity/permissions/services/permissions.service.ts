import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Permission } from '@prisma/client';

import { PermissionsRepository } from '../repositories/permissions.repository';

import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { PermissionFilterDto } from '../dto/permission-filter.dto';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly repository: PermissionsRepository,
  ) {}

  async create(
    dto: CreatePermissionDto,
  ): Promise<Permission> {
    const exists = await this.repository.findByCode(
      dto.code,
    );

    if (exists) {
      throw new BadRequestException(
        'Já existe uma permissão cadastrada com este código.',
      );
    }

    return this.repository.create({
      group: {
        connect: {
          id: dto.groupId,
        },
      },
      code: dto.code,
      name: dto.name,
      description: dto.description,
      active: dto.active ?? true,
    });
  }

  async findAll(
    filter: PermissionFilterDto,
  ) {
    return this.repository.findAll(filter);
  }

  async findById(
    id: string,
  ) {
    const permission = await this.repository.findById(id);

    if (!permission) {
      throw new NotFoundException(
        'Permissão não encontrada.',
      );
    }

    return permission;
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ) {
    const permission = await this.findById(id);

    if (
      dto.code &&
      dto.code !== permission.code
    ) {
      const exists =
        await this.repository.findByCode(dto.code);

      if (exists) {
        throw new BadRequestException(
          'Já existe uma permissão cadastrada com este código.',
        );
      }
    }

    return this.repository.update(id, {
      code: dto.code,
      name: dto.name,
      description: dto.description,
      active: dto.active,
      ...(dto.groupId && {
        group: {
          connect: {
            id: dto.groupId,
          },
        },
      }),
    });
  }

  async remove(
    id: string,
  ) {
    await this.findById(id);

    return this.repository.delete(id);
  }
}