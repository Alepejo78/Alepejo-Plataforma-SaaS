import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PayrollTaxTableRepository } from '../repositories/payroll-tax-table.repository';

import { CreatePayrollTaxTableDto } from '../dto/create-payroll-tax-table.dto';

@Injectable()
export class PayrollTaxTableService {
  constructor(private readonly repository: PayrollTaxTableRepository) {}

  async create(companyId: string, dto: CreatePayrollTaxTableDto) {
    const validFrom = new Date(dto.validFrom);

    // Fecha a vigência em aberto anterior no dia anterior ao início
    // da nova — nunca duas tabelas "atuais" ao mesmo tempo.
    const dayBefore = new Date(validFrom);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

    await this.repository.closeOpenTable(companyId, dayBefore);

    return this.repository.create(companyId, {
      validFrom,
      fgtsPercentage: dto.fgtsPercentage ?? 8,
      dependentDeductionValue: dto.dependentDeductionValue,
      irrfReliefThreshold: dto.irrfReliefThreshold,
      irrfReliefPhaseOutEnd: dto.irrfReliefPhaseOutEnd,
      irrfReliefBase: dto.irrfReliefBase,
      irrfReliefFactor: dto.irrfReliefFactor,
      brackets: {
        create: dto.brackets.map((bracket) => ({
          taxType: bracket.taxType,
          order: bracket.order,
          minBase: bracket.minBase,
          maxBase: bracket.maxBase,
          rate: bracket.rate,
          deduction: bracket.deduction,
        })),
      },
    });
  }

  async findAll(companyId: string) {
    return this.repository.findAll(companyId);
  }

  async findOne(companyId: string, id: string) {
    const table = await this.repository.findById(companyId, id);

    if (!table) {
      throw new NotFoundException(
        'Tabela de parâmetros fiscais não encontrada.',
      );
    }

    return table;
  }

  /** Tabela vigente hoje (ou na data informada) — usada pelo motor de cálculo da folha. */
  async findActive(companyId: string, referenceDate?: string) {
    const date = referenceDate ? new Date(referenceDate) : new Date();
    const table = await this.repository.findActiveAt(companyId, date);

    if (!table) {
      throw new BadRequestException(
        'Não há tabela de INSS/IRRF/FGTS cadastrada para esta data — cadastre os parâmetros fiscais antes de gerar a folha.',
      );
    }

    return table;
  }
}
