import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        company: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        company: true,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}