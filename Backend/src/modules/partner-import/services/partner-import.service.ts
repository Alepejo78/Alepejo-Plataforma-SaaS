import { BadRequestException, Injectable } from '@nestjs/common';

import {
  BusinessPartnerRole,
  BusinessPartnerStatus,
  PersonType,
} from '@prisma/client';

import {
  cellValue,
  mapHeaders,
  readSpreadsheet,
} from '../../../core/utils/spreadsheet-reader.util';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { BusinessPartnersRepository } from '../../business-partners/repositories/business-partners.repository';

import { PartnerImportRowDto } from '../dto/partner-import-row.dto';

const REQUIRED_KEYS = ['documento', 'papeis', 'razao_social'];

const ALL_KEYS = [
  ...REQUIRED_KEYS,
  'tipo_pessoa',
  'nome_fantasia',
  'inscricao_estadual',
  'email',
  'telefone',
  'celular',
  'contato',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
  'observacoes',
  'status',
];

const ROLE_MAP: Record<string, BusinessPartnerRole> = {
  CLIENTE: BusinessPartnerRole.CUSTOMER,
  FORNECEDOR: BusinessPartnerRole.SUPPLIER,
  TRANSPORTADORA: BusinessPartnerRole.CARRIER,
  REPRESENTANTE: BusinessPartnerRole.SALES_REP,
};

const PERSON_TYPE_MAP: Record<string, PersonType> = {
  FISICA: PersonType.INDIVIDUAL,
  JURIDICA: PersonType.COMPANY,
};

const STATUS_MAP: Record<string, BusinessPartnerStatus> = {
  ATIVO: BusinessPartnerStatus.ACTIVE,
  INATIVO: BusinessPartnerStatus.INACTIVE,
  BLOQUEADO: BusinessPartnerStatus.BLOCKED,
};

export interface PartnerPreviewRow {
  line: number;
  action: 'create' | 'update' | 'error';
  errors: string[];
  data: Partial<PartnerImportRowDto> & { document: string };
}

@Injectable()
export class PartnerImportService {
  constructor(
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly businessPartnersRepository: BusinessPartnersRepository,
  ) {}

  async parse(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    rootCompanyId: string,
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

    const previewRows: PartnerPreviewRow[] = [];
    let line = 1;

    for (const row of rows) {
      line++;

      if (row.every((cell) => !cell || !cell.trim())) {
        continue;
      }

      const errors: string[] = [];

      const document = cellValue(row, map, 'documento');
      const legalName = cellValue(row, map, 'razao_social');
      const papeisRaw = cellValue(row, map, 'papeis');
      const tipoPessoaRaw = cellValue(row, map, 'tipo_pessoa').toUpperCase();
      const statusRaw = cellValue(row, map, 'status').toUpperCase();
      const email = cellValue(row, map, 'email');

      if (!document) errors.push('Documento (CPF/CNPJ) é obrigatório.');
      if (!legalName) errors.push('Razão social/Nome é obrigatório.');

      const roles = papeisRaw
        .split(/[,;]/)
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean)
        .map((v) => ROLE_MAP[v])
        .filter((v): v is BusinessPartnerRole => Boolean(v));

      if (!papeisRaw || roles.length === 0) {
        errors.push(
          'Informe ao menos um papel válido: CLIENTE, FORNECEDOR, TRANSPORTADORA ou REPRESENTANTE.',
        );
      }

      const personType = tipoPessoaRaw
        ? PERSON_TYPE_MAP[tipoPessoaRaw]
        : undefined;
      if (tipoPessoaRaw && !personType) {
        errors.push('Tipo de pessoa deve ser FISICA ou JURIDICA.');
      }

      const status = statusRaw ? STATUS_MAP[statusRaw] : undefined;
      if (statusRaw && !status) {
        errors.push('Status deve ser ATIVO, INATIVO ou BLOQUEADO.');
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('E-mail inválido.');
      }

      const existing = document
        ? await this.businessPartnersRepository.findByDocument(
            rootCompanyId,
            document,
          )
        : null;

      const data: PartnerPreviewRow['data'] = {
        document,
        legalName,
        roles,
        personType,
        tradeName: cellValue(row, map, 'nome_fantasia') || undefined,
        stateRegistration:
          cellValue(row, map, 'inscricao_estadual') || undefined,
        email: email || undefined,
        phone: cellValue(row, map, 'telefone') || undefined,
        mobile: cellValue(row, map, 'celular') || undefined,
        contactName: cellValue(row, map, 'contato') || undefined,
        zipCode: cellValue(row, map, 'cep') || undefined,
        street: cellValue(row, map, 'logradouro') || undefined,
        number: cellValue(row, map, 'numero') || undefined,
        complement: cellValue(row, map, 'complemento') || undefined,
        district: cellValue(row, map, 'bairro') || undefined,
        city: cellValue(row, map, 'cidade') || undefined,
        state: cellValue(row, map, 'uf') || undefined,
        notes: cellValue(row, map, 'observacoes') || undefined,
        status,
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
    rootCompanyId: string,
    rows: PartnerImportRowDto[],
    userId: string,
  ) {
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const dto = {
        document: row.document,
        roles: row.roles,
        legalName: row.legalName,
        personType: row.personType,
        tradeName: row.tradeName,
        stateRegistration: row.stateRegistration,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        contactName: row.contactName,
        zipCode: row.zipCode,
        street: row.street,
        number: row.number,
        complement: row.complement,
        district: row.district,
        city: row.city,
        state: row.state,
        notes: row.notes,
        status: row.status,
      };

      if (row.action === 'update' && row.existingId) {
        await this.businessPartnersService.update(
          rootCompanyId,
          row.existingId,
          dto,
          userId,
        );
        updated++;
      } else {
        await this.businessPartnersService.create(rootCompanyId, dto, userId);
        created++;
      }
    }

    return { created, updated };
  }
}
