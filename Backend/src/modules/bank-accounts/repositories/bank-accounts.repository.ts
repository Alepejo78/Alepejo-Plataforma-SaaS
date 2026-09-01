import { Injectable } from '@nestjs/common';
import { BankAccount } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Injectable()
export class BankAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: CreateBankAccountDto, userId: string): Promise<BankAccount> {
    return this.prisma.bankAccount.create({
      data: {
        companyId,
        description: data.description,
        bankName: data.bankName,
        agency: data.agency,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        pixKeyType: data.pixKeyType,
        pixKey: data.pixKey,
        active: data.active,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async findById(companyId: string, id: string): Promise<BankAccount | null> {
    return this.prisma.bankAccount.findFirst({
      where: { id, companyId },
    });
  }

  async findAll(companyId: string, includeInactive = false): Promise<BankAccount[]> {
    return this.prisma.bankAccount.findMany({
      where: { companyId, ...(includeInactive ? {} : { active: true }) },
      orderBy: { description: 'asc' },
    });
  }

  async update(id: string, data: UpdateBankAccountDto, userId: string): Promise<BankAccount> {
    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.agency !== undefined && { agency: data.agency }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.accountType !== undefined && { accountType: data.accountType }),
        ...(data.pixKeyType !== undefined && { pixKeyType: data.pixKeyType }),
        ...(data.pixKey !== undefined && { pixKey: data.pixKey }),
        ...(data.active !== undefined && { active: data.active }),
        updatedById: userId,
      },
    });
  }

  async delete(id: string, userId: string): Promise<BankAccount> {
    return this.prisma.bankAccount.update({
      where: { id },
      data: { active: false, updatedById: userId },
    });
  }

  /** Quantos títulos usam esta conta — usado pra bloquear exclusão. */
  async countFinancialEntries(bankAccountId: string): Promise<number> {
    return this.prisma.financialEntry.count({
      where: { bankAccountId },
    });
  }
}
