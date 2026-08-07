import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserStatus } from '@prisma/client';

import { PasswordService } from '../../../../core/security/password.service';

import { UsersRepository } from '../repositories/users.repository';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async create(companyId: string, createUserDto: CreateUserDto) {
    const userExists = await this.usersRepository.findByEmail(
      createUserDto.email,
    );

    if (userExists) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    const passwordHash = await this.passwordService.hash(
      createUserDto.password,
    );

    return this.usersRepository.create({
      company: {
        connect: {
          id: companyId,
        },
      },
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
      status: UserStatus.PENDING_ACTIVATION,
      mustChangePassword: true,
      active: true,
    });
  }

  async findAll(companyId: string) {
    return this.usersRepository.findAll(companyId);
  }

  async findById(companyId: string, id: string) {
    const user = await this.usersRepository.findById(companyId, id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  // Usado apenas internamente pelo AuthService (login/refresh),
  // deliberadamente não escopado por companyId.
  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async update(
    companyId: string,
    id: string,
    updateUserDto: UpdateUserDto,
  ) {
    await this.findById(companyId, id);

    return this.usersRepository.update(id, updateUserDto);
  }

  async updateLoginSuccess(id: string) {
    return this.usersRepository.update(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async updateFailedLogin(id: string, attempts: number) {
    return this.usersRepository.update(id, {
      failedLoginAttempts: attempts,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findById(companyId, id);

    return this.usersRepository.softDelete(id);
  }
}
