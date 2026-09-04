import { BadRequestException, Injectable } from '@nestjs/common';

import {
  FinancialDocumentType,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
} from '@prisma/client';

import {
  cellValue,
  mapHeaders,
  readSpreadsheet,
} from '../../../core/utils/spreadsheet-reader.util';

import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { FinancialEntriesRepository } from '../../financial-entries/repositories/financial-entries.repository';
import { BusinessPartnersRepository } from '../../business-partners/repositories/business-partners.repository';
import { ProductsRepository } from '../../products/repositories/products.repository';
import { ChartOfAccountsRepository } from '../../chart-of-accounts/repositories/chart-of-accounts.repository';

import { FinancialEntryImportRowDto } from '../dto/financial-entry-import-row.dto';

const REQUIRED_KEYS = [
  'tipo',
  'documento_parceiro',
  'codigo_produto',
  'conta_contabil',
  'data_emissao',
  'data_vencimento',
  'valor',
  'forma_pagamento',
];

const ALL_KEYS = [
  ...REQUIRED_KEYS,
  'numero_documento',
  'tipo_documento',
  'chave_documento',
  'observacao',
  'status',
  'data_pagamento',
];

const TYPE_MAP: Record<string, FinancialEntryType> = {
  PAGAR: FinancialEntryType.PAYABLE,
  RECEBER: FinancialEntryType.RECEIVABLE,
};

// Mesmas palavras que aparecem na tela de Contas a Pagar/Receber
// (FINANCIAL_ENTRY_STATUS_LABELS no frontend) — evita a pessoa
// digitar um status na planilha que não bate com o que vê no
// sistema. Aceita variação sem "em"/plural como atalho.
const STATUS_MAP: Record<string, FinancialEntryStatus> = {
  ABERTO: FinancialEntryStatus.OPEN,
  'EM ABERTO': FinancialEntryStatus.OPEN,
  BAIXADO: FinancialEntryStatus.PAID,
  CANCELADO: FinancialEntryStatus.CANCELLED,
};

function parseDate(value: string): string | null {
  if (!value) return null;

  // Já vem ISO (célula de data de verdade no .xlsx).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // dd/mm/aaaa ou dd-mm-aaaa (formato do resto do sistema).
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseNumber(value: string): number | null {
  if (!value) return null;

  const normalized = value.replace(/\./g, '').replace(',', '.');
  const asBr = Number(normalized);
  const asIs = Number(value);

  if (!Number.isNaN(asBr) && value.includes(',')) {
    return asBr;
  }

  return Number.isNaN(asIs) ? null : asIs;
}

export interface FinancialEntryPreviewRow {
  line: number;
  action: 'create' | 'update' | 'error';
  errors: string[];
  data: Partial<FinancialEntryImportRowDto>;
}

@Injectable()
export class FinancialEntryImportService {
  constructor(
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly financialEntriesRepository: FinancialEntriesRepository,
    private readonly businessPartnersRepository: BusinessPartnersRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly chartOfAccountsRepository: ChartOfAccountsRepository,
  ) {}

  async parse(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    companyId: string,
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

    const partnerCache = new Map<string, string | null>();
    const productCache = new Map<string, string | null>();
    const chartOfAccountCache = new Map<string, string | null>();

    const previewRows: FinancialEntryPreviewRow[] = [];
    let line = 1;

    for (const row of rows) {
      line++;

      if (row.every((cell) => !cell || !cell.trim())) {
        continue;
      }

      const errors: string[] = [];

      const tipoRaw = cellValue(row, map, 'tipo').toUpperCase();
      const documentoParceiro = cellValue(row, map, 'documento_parceiro');
      const codigoProduto = cellValue(row, map, 'codigo_produto');
      const contaContabil = cellValue(row, map, 'conta_contabil');
      const numeroDocumento =
        cellValue(row, map, 'numero_documento') || undefined;
      const dataEmissaoRaw = cellValue(row, map, 'data_emissao');
      const dataVencimentoRaw = cellValue(row, map, 'data_vencimento');
      const valorRaw = cellValue(row, map, 'valor');
      const formaPagamentoRaw = cellValue(
        row,
        map,
        'forma_pagamento',
      ).toUpperCase();
      const tipoDocumentoRaw = cellValue(
        row,
        map,
        'tipo_documento',
      ).toUpperCase();
      // Colapsa espaço duplo/múltiplo — "Em  Aberto" ou "EM ABERTO"
      // batem igual na hora de bater com o STATUS_MAP.
      const statusRaw = cellValue(row, map, 'status')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
      const dataPagamentoRaw = cellValue(row, map, 'data_pagamento');

      const type = TYPE_MAP[tipoRaw];
      if (!type) {
        errors.push('Tipo deve ser PAGAR ou RECEBER.');
      }

      let partnerId: string | undefined;
      if (!documentoParceiro) {
        errors.push('Documento do parceiro é obrigatório.');
      } else {
        if (!partnerCache.has(documentoParceiro)) {
          const partner = await this.businessPartnersRepository.findByDocument(
            rootCompanyId,
            documentoParceiro,
          );
          partnerCache.set(documentoParceiro, partner?.id ?? null);
        }
        partnerId = partnerCache.get(documentoParceiro) ?? undefined;
        if (!partnerId) {
          errors.push(
            `Parceiro com documento "${documentoParceiro}" não encontrado — cadastre-o antes de importar.`,
          );
        }
      }

      let productId: string | undefined;
      if (!codigoProduto) {
        errors.push('Código do produto é obrigatório.');
      } else {
        if (!productCache.has(codigoProduto)) {
          const product = await this.productsRepository.findByCode(
            rootCompanyId,
            codigoProduto,
          );
          productCache.set(codigoProduto, product?.id ?? null);
        }
        productId = productCache.get(codigoProduto) ?? undefined;
        if (!productId) {
          errors.push(
            `Produto "${codigoProduto}" não encontrado — cadastre-o antes de importar.`,
          );
        }
      }

      let chartOfAccountId: string | undefined;
      if (!contaContabil) {
        errors.push('Conta contábil é obrigatória.');
      } else {
        if (!chartOfAccountCache.has(contaContabil)) {
          const account = await this.chartOfAccountsRepository.findByCode(
            rootCompanyId,
            contaContabil,
          );
          chartOfAccountCache.set(contaContabil, account?.id ?? null);
        }
        chartOfAccountId = chartOfAccountCache.get(contaContabil) ?? undefined;
        if (!chartOfAccountId) {
          errors.push(
            `Conta contábil "${contaContabil}" não encontrada — cadastre-a antes de importar.`,
          );
        }
      }

      const issueDate = parseDate(dataEmissaoRaw);
      if (!issueDate) {
        errors.push('Data de emissão é obrigatória (dd/mm/aaaa).');
      }

      const dueDate = parseDate(dataVencimentoRaw);
      if (!dueDate) {
        errors.push('Data de vencimento é obrigatória (dd/mm/aaaa).');
      }

      const amount = parseNumber(valorRaw);
      if (amount === null || amount <= 0) {
        errors.push('Valor é obrigatório e precisa ser maior que zero.');
      }

      const paymentMethod = (
        PaymentMethod as unknown as Record<string, PaymentMethod>
      )[formaPagamentoRaw];
      if (!paymentMethod) {
        errors.push(
          `Forma de pagamento inválida — use um dos valores: ${Object.keys(PaymentMethod).join(', ')}.`,
        );
      }

      const documentType = tipoDocumentoRaw
        ? (FinancialDocumentType as unknown as Record<
            string,
            FinancialDocumentType
          >)[tipoDocumentoRaw]
        : undefined;
      if (tipoDocumentoRaw && !documentType) {
        errors.push(
          `Tipo de documento inválido — use um dos valores: ${Object.keys(FinancialDocumentType).join(', ')}.`,
        );
      }

      const status = statusRaw ? STATUS_MAP[statusRaw] : FinancialEntryStatus.OPEN;
      if (statusRaw && !status) {
        errors.push('Status deve ser EM ABERTO, BAIXADO ou CANCELADO.');
      }

      // Baixa histórica (título antigo que já veio pago de outro
      // sistema) — sem data de pagamento na planilha, assume o
      // vencimento (mesmo raciocínio de "sem vencimento calculado,
      // vence na própria data" do lançamento manual).
      let paymentDate: string | undefined;
      if (status === FinancialEntryStatus.PAID) {
        if (dataPagamentoRaw) {
          const parsedPaymentDate = parseDate(dataPagamentoRaw);
          if (!parsedPaymentDate) {
            errors.push('Data de pagamento inválida (dd/mm/aaaa).');
          }
          paymentDate = parsedPaymentDate ?? undefined;
        } else {
          paymentDate = dueDate ?? undefined;
        }
      }

      const existing =
        partnerId && numeroDocumento
          ? await this.financialEntriesRepository.findByPartnerAndDocument(
              companyId,
              partnerId,
              numeroDocumento,
            )
          : null;

      // Reabrir/estornar pra depois alterar é fluxo manual de
      // propósito (mexe com o caixa já fechado) — importação não
      // pode sobrescrever um título que já foi baixado.
      if (existing?.status === FinancialEntryStatus.PAID) {
        errors.push(
          'Este título já está baixado no sistema — estorne a baixa manualmente antes de reimportar esta linha.',
        );
      }

      const data: FinancialEntryPreviewRow['data'] = {
        type,
        partnerId,
        productId,
        chartOfAccountId,
        documentNumber: numeroDocumento,
        issueDate: issueDate ?? undefined,
        dueDate: dueDate ?? undefined,
        amount: amount ?? undefined,
        paymentMethod,
        documentType,
        documentKey: cellValue(row, map, 'chave_documento') || undefined,
        observation: cellValue(row, map, 'observacao') || undefined,
        status,
        paymentDate,
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
    rows: FinancialEntryImportRowDto[],
    userId: string,
  ) {
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const dto = {
        type: row.type,
        partnerId: row.partnerId,
        chartOfAccountId: row.chartOfAccountId,
        productId: row.productId,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        amount: row.amount,
        paymentMethod: row.paymentMethod,
        documentNumber: row.documentNumber,
        documentType: row.documentType,
        documentKey: row.documentKey,
        observation: row.observation,
      };

      let entryId: string;

      if (row.action === 'update' && row.existingId) {
        const entry = await this.financialEntriesService.update(
          companyId,
          rootCompanyId,
          row.existingId,
          dto,
          userId,
        );
        entryId = entry.id;
        updated++;
      } else {
        const entry = await this.financialEntriesService.create(
          companyId,
          rootCompanyId,
          dto,
          userId,
        );
        entryId = entry.id;
        created++;
      }

      // Título nasce sempre em aberto — se a planilha marcou como
      // já pago/cancelado (histórico de outro sistema), aplica a
      // baixa/cancelamento por cima, igual seria feito na tela.
      if (row.status === FinancialEntryStatus.PAID) {
        await this.financialEntriesService.settle(
          companyId,
          entryId,
          {
            paymentDate: row.paymentDate,
            paymentMethod: row.paymentMethod,
            paidAmount: row.amount,
          },
          userId,
        );
      } else if (row.status === FinancialEntryStatus.CANCELLED) {
        await this.financialEntriesService.cancel(companyId, entryId, userId);
      }
    }

    return { created, updated };
  }
}
