import { BadRequestException, Injectable } from '@nestjs/common';

import {
  BankAccountType,
  EducationLevel,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  PaymentMethod,
  PixKeyType,
  SalaryType,
} from '@prisma/client';

import {
  cellValue,
  mapHeaders,
  readSpreadsheet,
} from '../../../core/utils/spreadsheet-reader.util';

import { EmployeesService } from '../../employees/services/employees.service';
import { EmployeesRepository } from '../../employees/repositories/employees.repository';
import { JobFunctionsRepository } from '../../job-functions/repositories/job-functions.repository';
import { SectorsRepository } from '../../sectors/repositories/sectors.repository';
import { WorkSchedulesRepository } from '../../work-schedules/repositories/work-schedules.repository';

import { EmployeeImportRowDto } from '../dto/employee-import-row.dto';

const REQUIRED_KEYS = ['nome'];

const ALL_KEYS = [
  ...REQUIRED_KEYS,
  'cpf',
  'rg',
  'pis',
  'data_nascimento',
  'genero',
  'estado_civil',
  'escolaridade',
  'telefone',
  'celular',
  'email',
  'cep',
  'logradouro',
  'numero',
  'bairro',
  'cidade',
  'uf',
  'funcao',
  'setor',
  'horario_trabalho',
  'salario_base',
  'tipo_salario',
  'forma_pagamento',
  'data_admissao',
  'status',
  'banco',
  'agencia',
  'conta',
  'tipo_conta',
  'tipo_chave_pix',
  'chave_pix',
  'observacoes',
];

function parseNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\./g, '').replace(',', '.');
  const asIs = Number(value);
  const asBr = Number(normalized);

  if (!Number.isNaN(asBr) && value.includes(',')) {
    return asBr;
  }

  return Number.isNaN(asIs) ? null : asIs;
}

/** Enums já em português, iguais à chave do Prisma — só confere se o valor bate com algum deles. */
function parseEnum<T extends string>(
  value: string,
  enumObject: Record<string, T>,
): T | undefined {
  if (!value) return undefined;
  const values = Object.values(enumObject) as string[];
  const match = values.find((v) => v === value.toUpperCase());
  return match as T | undefined;
}

export interface EmployeePreviewRow {
  line: number;
  action: 'create' | 'update' | 'error';
  errors: string[];
  data: Partial<EmployeeImportRowDto> & { name: string };
}

@Injectable()
export class EmployeeImportService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeesRepository: EmployeesRepository,
    private readonly jobFunctionsRepository: JobFunctionsRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly workSchedulesRepository: WorkSchedulesRepository,
  ) {}

  async parse(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    companyId: string,
  ) {
    const { headers, rows } = await readSpreadsheet(
      buffer,
      filename,
      mimetype,
    );

    const map = mapHeaders(headers, ALL_KEYS);

    const missingRequired = REQUIRED_KEYS.filter((key) => !map.has(key));

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Planilha fora do layout — colunas obrigatórias ausentes: ${missingRequired.join(', ')}. Baixe o layout padrão e preencha nele.`,
      );
    }

    const jobFunctionCache = new Map<string, string | null>();
    const workScheduleCache = new Map<string, string | null>();

    const previewRows: EmployeePreviewRow[] = [];
    let line = 1;

    for (const row of rows) {
      line++;

      if (row.every((cell) => !cell || !cell.trim())) {
        continue;
      }

      const errors: string[] = [];

      const name = cellValue(row, map, 'nome');
      const cpf = cellValue(row, map, 'cpf');
      const email = cellValue(row, map, 'email');
      const generoRaw = cellValue(row, map, 'genero');
      const estadoCivilRaw = cellValue(row, map, 'estado_civil');
      const escolaridadeRaw = cellValue(row, map, 'escolaridade');
      const salarioRaw = cellValue(row, map, 'salario_base');
      const tipoSalarioRaw = cellValue(row, map, 'tipo_salario');
      const formaPagamentoRaw = cellValue(row, map, 'forma_pagamento');
      const statusRaw = cellValue(row, map, 'status');
      const tipoContaRaw = cellValue(row, map, 'tipo_conta');
      const tipoChavePixRaw = cellValue(row, map, 'tipo_chave_pix');
      const funcaoNome = cellValue(row, map, 'funcao');
      const setorNome = cellValue(row, map, 'setor');
      const horarioNome = cellValue(row, map, 'horario_trabalho');

      if (!name) errors.push('Nome é obrigatório.');

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('E-mail inválido.');
      }

      const gender = parseEnum(generoRaw, Gender);
      if (generoRaw && !gender) {
        errors.push('Gênero deve ser MASCULINO, FEMININO ou OUTRO.');
      }

      const maritalStatus = parseEnum(estadoCivilRaw, MaritalStatus);
      if (estadoCivilRaw && !maritalStatus) {
        errors.push(
          'Estado civil deve ser SOLTEIRO, CASADO, DIVORCIADO, VIUVO, UNIAO_ESTAVEL ou OUTRO.',
        );
      }

      const educationLevel = parseEnum(escolaridadeRaw, EducationLevel);
      if (escolaridadeRaw && !educationLevel) {
        errors.push(
          'Escolaridade inválida — ver layout padrão para os valores aceitos.',
        );
      }

      const baseSalary =
        parseNumber(salarioRaw) ?? (salarioRaw ? null : undefined);
      if (salarioRaw && baseSalary === null) {
        errors.push('Salário base precisa ser um número.');
      }

      const salaryType = parseEnum(tipoSalarioRaw, SalaryType);
      if (tipoSalarioRaw && !salaryType) {
        errors.push(
          'Tipo de salário deve ser MENSALISTA, HORISTA, DIARISTA, COMISSIONADO ou OUTRO.',
        );
      }

      const paymentMethod = parseEnum(formaPagamentoRaw, PaymentMethod);
      if (formaPagamentoRaw && !paymentMethod) {
        errors.push('Forma de pagamento inválida.');
      }

      const status = parseEnum(statusRaw, EmployeeStatus);
      if (statusRaw && !status) {
        errors.push(
          'Status deve ser EXPERIENCIA, ATIVO, AFASTADO ou DEMITIDO.',
        );
      }

      const bankAccountType = parseEnum(tipoContaRaw, BankAccountType);
      if (tipoContaRaw && !bankAccountType) {
        errors.push('Tipo de conta deve ser CORRENTE ou POUPANCA.');
      }

      const pixKeyType = parseEnum(tipoChavePixRaw, PixKeyType);
      if (tipoChavePixRaw && !pixKeyType) {
        errors.push(
          'Tipo de chave PIX deve ser CPF, CNPJ, EMAIL, TELEFONE ou ALEATORIA.',
        );
      }

      // Função (cria sozinha se não existir — mesmo padrão de categoria/marca do import de produtos).
      let jobFunctionId: string | undefined;
      if (funcaoNome) {
        if (!jobFunctionCache.has(funcaoNome)) {
          const existingFn = await this.jobFunctionsRepository.findByName(
            companyId,
            funcaoNome,
          );

          if (existingFn) {
            jobFunctionCache.set(funcaoNome, existingFn.id);
          } else {
            let sectorId: string | undefined;

            if (setorNome) {
              const existingSector =
                await this.sectorsRepository.findByName(
                  companyId,
                  setorNome,
                );

              sectorId = existingSector
                ? existingSector.id
                : (await this.sectorsRepository.create(companyId, {
                    name: setorNome,
                  })).id;
            }

            const created = await this.jobFunctionsRepository.create(
              companyId,
              { name: funcaoNome, sectorId },
              undefined,
            );

            jobFunctionCache.set(funcaoNome, created.id);
          }
        }

        jobFunctionId = jobFunctionCache.get(funcaoNome) ?? undefined;
      }

      // Horário de trabalho: precisa já existir (turnos não dá pra inventar sozinho).
      let workScheduleId: string | undefined;
      if (horarioNome) {
        if (!workScheduleCache.has(horarioNome)) {
          const schedule = await this.workSchedulesRepository.findByName(
            companyId,
            horarioNome,
          );
          workScheduleCache.set(horarioNome, schedule?.id ?? null);
        }

        workScheduleId = workScheduleCache.get(horarioNome) ?? undefined;
        if (!workScheduleId) {
          errors.push(
            `Horário de trabalho "${horarioNome}" não encontrado — cadastre-o antes de importar.`,
          );
        }
      }

      const existing = cpf
        ? await this.employeesRepository.findByCpf(companyId, cpf)
        : null;

      const data: EmployeePreviewRow['data'] = {
        name,
        cpf: cpf || undefined,
        rg: cellValue(row, map, 'rg') || undefined,
        pis: cellValue(row, map, 'pis') || undefined,
        birthDate: cellValue(row, map, 'data_nascimento') || undefined,
        gender,
        maritalStatus,
        educationLevel,
        phone: cellValue(row, map, 'telefone') || undefined,
        mobile: cellValue(row, map, 'celular') || undefined,
        email: email || undefined,
        zipCode: cellValue(row, map, 'cep') || undefined,
        street: cellValue(row, map, 'logradouro') || undefined,
        number: cellValue(row, map, 'numero') || undefined,
        district: cellValue(row, map, 'bairro') || undefined,
        city: cellValue(row, map, 'cidade') || undefined,
        state: cellValue(row, map, 'uf') || undefined,
        jobFunctionId,
        workScheduleId,
        baseSalary: baseSalary ?? undefined,
        salaryType,
        paymentMethod,
        admissionDate: cellValue(row, map, 'data_admissao') || undefined,
        status,
        bankName: cellValue(row, map, 'banco') || undefined,
        bankAgency: cellValue(row, map, 'agencia') || undefined,
        bankAccount: cellValue(row, map, 'conta') || undefined,
        bankAccountType,
        pixKeyType,
        pixKey: cellValue(row, map, 'chave_pix') || undefined,
        observation: cellValue(row, map, 'observacoes') || undefined,
        existingId: existing?.id,
      };

      previewRows.push({
        line,
        action:
          errors.length > 0 ? 'error' : existing ? 'update' : 'create',
        errors,
        data,
      });
    }

    return {
      toCreate: previewRows.filter((r) => r.action === 'create').length,
      toUpdate: previewRows.filter((r) => r.action === 'update').length,
      toError: previewRows.filter((r) => r.action === 'error').length,
      rows: previewRows,
    };
  }

  async confirm(
    companyId: string,
    rootCompanyId: string,
    rows: EmployeeImportRowDto[],
    userId: string,
  ) {
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const dto = {
        name: row.name,
        cpf: row.cpf,
        rg: row.rg,
        pis: row.pis,
        birthDate: row.birthDate,
        gender: row.gender,
        maritalStatus: row.maritalStatus,
        educationLevel: row.educationLevel,
        phone: row.phone,
        mobile: row.mobile,
        email: row.email,
        zipCode: row.zipCode,
        street: row.street,
        number: row.number,
        district: row.district,
        city: row.city,
        state: row.state,
        jobFunctionId: row.jobFunctionId,
        workScheduleId: row.workScheduleId,
        baseSalary: row.baseSalary,
        salaryType: row.salaryType,
        paymentMethod: row.paymentMethod,
        admissionDate: row.admissionDate,
        status: row.status,
        bankName: row.bankName,
        bankAgency: row.bankAgency,
        bankAccount: row.bankAccount,
        bankAccountType: row.bankAccountType,
        pixKeyType: row.pixKeyType,
        pixKey: row.pixKey,
        observation: row.observation,
      };

      if (row.action === 'update' && row.existingId) {
        await this.employeesService.update(companyId, row.existingId, dto);
        updated++;
      } else {
        await this.employeesService.create(
          companyId,
          rootCompanyId,
          dto,
          userId,
        );
        created++;
      }
    }

    return { created, updated };
  }
}
