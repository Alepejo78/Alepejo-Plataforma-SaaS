import { BadRequestException, Injectable } from '@nestjs/common';

import {
  InventoryControl,
  ProductStatus,
  ProductType,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  cellValue,
  mapHeaders,
  readSpreadsheet,
} from '../../../core/utils/spreadsheet-reader.util';

import { ProductsRepository } from '../../products/repositories/products.repository';
import { ProductCategoriesRepository } from '../../product-categories/repositories/product-categories.repository';
import { BrandsRepository } from '../../brands/repositories/brands.repository';
import { UnitsOfMeasureRepository } from '../../units-of-measure/repositories/units-of-measure.repository';
import { ChartOfAccountsRepository } from '../../chart-of-accounts/repositories/chart-of-accounts.repository';

import { ProductImportRowDto } from '../dto/product-import-row.dto';

const REQUIRED_KEYS = [
  'codigo',
  'descricao',
  'tipo',
  'controle_estoque',
  'unidade',
  'preco_venda',
];

const ALL_KEYS = [
  ...REQUIRED_KEYS,
  'codigo_barras',
  'referencia',
  'descricao_complementar',
  'categoria',
  'marca',
  'conta_compra',
  'conta_venda',
  'estoque_minimo',
  'peso_kg',
  'cubagem_m3',
  'lote_minimo_producao',
  'status',
];

const TYPE_MAP: Record<string, ProductType> = {
  PRODUTO: ProductType.PRODUCT,
  SERVICO: ProductType.SERVICE,
};

const INVENTORY_MAP: Record<string, InventoryControl> = {
  NENHUM: InventoryControl.NONE,
  SIMPLES: InventoryControl.SIMPLE,
  LOTE: InventoryControl.BATCH,
  SERIE: InventoryControl.SERIAL,
};

const STATUS_MAP: Record<string, ProductStatus> = {
  ATIVO: ProductStatus.ACTIVE,
  INATIVO: ProductStatus.INACTIVE,
};

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

export interface ProductPreviewRow {
  line: number;
  action: 'create' | 'update' | 'error';
  errors: string[];
  data: Partial<ProductImportRowDto> & { code: string };
}

@Injectable()
export class ProductImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: ProductCategoriesRepository,
    private readonly brandsRepository: BrandsRepository,
    private readonly unitsRepository: UnitsOfMeasureRepository,
    private readonly chartOfAccountsRepository: ChartOfAccountsRepository,
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

    const unitCache = new Map<string, string | null>();
    const chartOfAccountCache = new Map<string, string | null>();

    const previewRows: ProductPreviewRow[] = [];
    let line = 1;

    for (const row of rows) {
      line++;

      if (row.every((cell) => !cell || !cell.trim())) {
        continue;
      }

      const errors: string[] = [];

      const code = cellValue(row, map, 'codigo');
      const description = cellValue(row, map, 'descricao');
      const tipoRaw = cellValue(row, map, 'tipo').toUpperCase();
      const controleRaw = cellValue(
        row,
        map,
        'controle_estoque',
      ).toUpperCase();
      const unidadeCode = cellValue(row, map, 'unidade');
      const precoRaw = cellValue(row, map, 'preco_venda');
      const statusRaw = cellValue(row, map, 'status').toUpperCase();

      if (!code) errors.push('Código é obrigatório.');
      if (!description) errors.push('Descrição é obrigatória.');

      const type = TYPE_MAP[tipoRaw];
      if (!type) {
        errors.push('Tipo deve ser PRODUTO ou SERVICO.');
      }

      const inventoryControl = INVENTORY_MAP[controleRaw];
      if (!inventoryControl) {
        errors.push(
          'Controle de estoque deve ser NENHUM, SIMPLES, LOTE ou SERIE.',
        );
      }

      let unitId: string | undefined;
      if (!unidadeCode) {
        errors.push('Unidade é obrigatória.');
      } else {
        if (!unitCache.has(unidadeCode)) {
          const unit = await this.unitsRepository.findByCode(
            rootCompanyId,
            unidadeCode,
          );
          unitCache.set(unidadeCode, unit?.id ?? null);
        }
        unitId = unitCache.get(unidadeCode) ?? undefined;
        if (!unitId) {
          errors.push(
            `Unidade "${unidadeCode}" não encontrada — cadastre-a antes de importar.`,
          );
        }
      }

      const salePrice = parseNumber(precoRaw);
      if (salePrice === null) {
        errors.push('Preço de venda é obrigatório e precisa ser um número.');
      }

      const resolveChartOfAccount = async (
        codeValue: string,
      ): Promise<string | undefined> => {
        if (!codeValue) return undefined;

        if (!chartOfAccountCache.has(codeValue)) {
          const account = await this.chartOfAccountsRepository.findByCode(
            rootCompanyId,
            codeValue,
          );
          chartOfAccountCache.set(codeValue, account?.id ?? null);
        }

        const id = chartOfAccountCache.get(codeValue);
        if (!id) {
          errors.push(
            `Conta contábil "${codeValue}" não encontrada — cadastre-a antes de importar.`,
          );
        }
        return id ?? undefined;
      };

      const chartOfAccountId = await resolveChartOfAccount(
        cellValue(row, map, 'conta_compra'),
      );
      const saleChartOfAccountId = await resolveChartOfAccount(
        cellValue(row, map, 'conta_venda'),
      );

      const status = statusRaw ? STATUS_MAP[statusRaw] : undefined;
      if (statusRaw && !status) {
        errors.push('Status deve ser ATIVO ou INATIVO.');
      }

      const minimumStock = parseNumber(cellValue(row, map, 'estoque_minimo')) ?? undefined;
      const weightKg = parseNumber(cellValue(row, map, 'peso_kg')) ?? undefined;
      const cubageM3 = parseNumber(cellValue(row, map, 'cubagem_m3')) ?? undefined;
      const minProductionBatch =
        parseNumber(cellValue(row, map, 'lote_minimo_producao')) ?? undefined;

      const existing = code
        ? await this.productsRepository.findByCode(rootCompanyId, code)
        : null;

      const data: ProductPreviewRow['data'] = {
        code,
        description,
        type,
        inventoryControl,
        unitId,
        salePrice: salePrice ?? undefined,
        barcode: cellValue(row, map, 'codigo_barras') || undefined,
        reference: cellValue(row, map, 'referencia') || undefined,
        complementaryDescription:
          cellValue(row, map, 'descricao_complementar') || undefined,
        categoryName: cellValue(row, map, 'categoria') || undefined,
        brandName: cellValue(row, map, 'marca') || undefined,
        chartOfAccountId,
        saleChartOfAccountId,
        minimumStock,
        weightKg,
        cubageM3,
        minProductionBatch,
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
    rows: ProductImportRowDto[],
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const categoryCache = new Map<string, string>();
      const brandCache = new Map<string, string>();

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        let categoryId: string | undefined;
        let brandId: string | undefined;

        if (row.categoryName) {
          if (!categoryCache.has(row.categoryName)) {
            const existing = await tx.productCategory.findFirst({
              where: { companyId: rootCompanyId, name: row.categoryName },
            });
            const category =
              existing ??
              (await tx.productCategory.create({
                data: { companyId: rootCompanyId, name: row.categoryName },
              }));
            categoryCache.set(row.categoryName, category.id);
          }
          categoryId = categoryCache.get(row.categoryName);
        }

        if (row.brandName) {
          if (!brandCache.has(row.brandName)) {
            const existing = await tx.brand.findFirst({
              where: { companyId: rootCompanyId, name: row.brandName },
            });
            const brand =
              existing ??
              (await tx.brand.create({
                data: {
                  companyId: rootCompanyId,
                  name: row.brandName,
                  active: true,
                },
              }));
            brandCache.set(row.brandName, brand.id);
          }
          brandId = brandCache.get(row.brandName);
        }

        const data = {
          code: row.code,
          description: row.description,
          type: row.type,
          inventoryControl: row.inventoryControl,
          unitId: row.unitId,
          salePrice: row.salePrice,
          barcode: row.barcode,
          reference: row.reference,
          complementaryDescription: row.complementaryDescription,
          categoryId,
          brandId,
          chartOfAccountId: row.chartOfAccountId,
          saleChartOfAccountId: row.saleChartOfAccountId,
          minimumStock: row.minimumStock,
          weightKg: row.weightKg,
          cubageM3: row.cubageM3,
          minProductionBatch: row.minProductionBatch,
          status: row.status ?? ProductStatus.ACTIVE,
        };

        if (row.action === 'update' && row.existingId) {
          await tx.product.update({
            where: { id: row.existingId },
            data: { ...data, updatedById: userId },
          });
          updated++;
        } else {
          await tx.product.create({
            data: {
              ...data,
              companyId: rootCompanyId,
              createdById: userId,
              updatedById: userId,
            },
          });
          created++;
        }
      }

      return { created, updated };
    });
  }
}
