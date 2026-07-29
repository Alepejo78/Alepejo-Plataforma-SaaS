import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UserStatus } from '@prisma/client';

import { PasswordService } from '../../../../core/security/password.service';

import { CompanyService } from '../../company/services/company.service';
import { UsersRepository } from '../repositories/users.repository';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companyService: CompanyService,
    private readonly passwordService: PasswordService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const company = await this.companyService.findById(
      createUserDto.companyId,
    );

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

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
          id: createUserDto.companyId,
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

  async findAll() {
    return this.usersRepository.findAll();
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

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

  async remove(id: string) {
    await this.findById(id);

    return this.usersRepository.softDelete(id);
  }
}