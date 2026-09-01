import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BankAccount } from '@prisma/client';

import { BankAccountsRepository } from '../repositories/bank-accounts.repository';

import { CreateBankAccountDto } from '../dto/create-bank-account.dto';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly repository: BankAccountsRepository) {}

  async create(companyId: string, dto: CreateBankAccountDto, userId: string): Promise<BankAccount> {
    return this.repository.create(companyId, dto, userId);
  }

  async findAll(companyId: string, includeInactive?: boolean): Promise<BankAccount[]> {
    return this.repository.findAll(companyId, includeInactive);
  }

  async findById(companyId: string, id: string): Promise<BankAccount> {
    const account = await this.repository.findById(companyId, id);

    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }

    return account;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateBankAccountDto,
    userId: string,
  ): Promise<BankAccount> {
    await this.findById(companyId, id);

    return this.repository.update(id, dto, userId);
  }

  async remove(companyId: string, id: string, userId: string): Promise<void> {
    await this.findById(companyId, id);

    const inUse = await this.repository.countFinancialEntries(id);

    if (inUse > 0) {
      throw new BadRequestException(
        'Esta conta bancária está vinculada a títulos do financeiro e não pode ser excluída.',
      );
    }

    await this.repository.delete(id, userId);
  }
}
