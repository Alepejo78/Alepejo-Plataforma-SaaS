import { BadRequestException, Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

export interface ParsedInvoiceItem {
  code: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ean: string | null;
}

export interface ParsedInvoiceInstallment {
  dueDate: string;
  amount: number;
}

export interface ParsedInvoiceParty {
  document: string;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export interface ParsedInvoice {
  kind: 'NFE' | 'NFSE';
  /** Fornecedor (compra) ou cliente (venda) — quem está "do outro lado". */
  party: ParsedInvoiceParty | null;
  invoiceNumber: string | null;
  invoiceKey: string | null;
  invoiceIssueDate: string | null;
  items: ParsedInvoiceItem[];
  totalAmount: number | null;
  installments: ParsedInvoiceInstallment[];
  /** Peso do transporte (total da nota, não por item) — só NF-e. */
  grossWeightKg: number | null;
  netWeightKg: number | null;
  /** Campos que o layout não trouxe — a tela pede pra completar. */
  warnings: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

/** fast-xml-parser vira objeto único quando só tem 1 item, e array
 * quando tem mais de 1 — normaliza pros dois casos sempre virarem lista. */
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/**
 * Busca recursiva por um dos nomes de campo em qualquer profundidade
 * do objeto — usada só na leitura best-effort de NFS-e, cujo layout
 * varia por prefeitura (não tem padrão nacional único como a NF-e).
 */
function findFirstByKeys(
  node: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (depth > 12 || node === null || typeof node !== 'object') {
    return undefined;
  }

  const lowerKeys = keys.map((k) => k.toLowerCase());

  for (const [key, value] of Object.entries(
    node as Record<string, unknown>,
  )) {
    if (lowerKeys.includes(key.toLowerCase())) {
      return value;
    }
  }

  for (const value of Object.values(
    node as Record<string, unknown>,
  )) {
    if (value && typeof value === 'object') {
      const found = findFirstByKeys(value, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

@Injectable()
export class InvoiceXmlParserService {
  parse(xml: string): ParsedInvoice {
    let parsed: Record<string, unknown>;

    try {
      parsed = parser.parse(xml);
    } catch {
      throw new BadRequestException(
        'Não foi possível ler este arquivo XML — verifique se o arquivo não está corrompido.',
      );
    }

    const infNFe = findFirstByKeys(parsed, ['infNFe']);

    if (infNFe && typeof infNFe === 'object') {
      return this.parseNfe(infNFe as Record<string, unknown>);
    }

    return this.parseNfseBestEffort(parsed);
  }

  private parseNfe(
    infNFe: Record<string, unknown>,
  ): ParsedInvoice {
    const chave = toText(infNFe['@_Id'])?.replace(
      /^NFe/,
      '',
    ) ?? null;

    const ide = (infNFe.ide ?? {}) as Record<string, unknown>;
    const emit = (infNFe.emit ?? {}) as Record<string, unknown>;
    const dest = (infNFe.dest ?? {}) as Record<string, unknown>;
    const total = (infNFe.total ?? {}) as Record<string, unknown>;
    const icmsTot = (total.ICMSTot ?? {}) as Record<
      string,
      unknown
    >;
    const transp = (infNFe.transp ?? {}) as Record<
      string,
      unknown
    >;
    const vol = toArray(transp.vol)[0] as
      | Record<string, unknown>
      | undefined;
    const cobr = (infNFe.cobr ?? {}) as Record<string, unknown>;

    const warnings: string[] = [];

    const party = this.readParty(emit) ?? this.readParty(dest);
    if (!party) {
      warnings.push(
        'Não achei os dados do fornecedor/cliente na nota — preencha na mão.',
      );
    }

    const items: ParsedInvoiceItem[] = toArray(
      infNFe.det,
    ).map((det) => {
      const prod = ((det as Record<string, unknown>).prod ??
        {}) as Record<string, unknown>;

      return {
        code: toText(prod.cProd),
        description: toText(prod.xProd) ?? 'Item sem descrição',
        ncm: toText(prod.NCM),
        cfop: toText(prod.CFOP),
        unit: toText(prod.uCom),
        quantity: toNumber(prod.qCom),
        unitPrice: toNumber(prod.vUnCom),
        totalPrice: toNumber(prod.vProd),
        ean: toText(prod.cEAN),
      };
    });

    if (items.length === 0) {
      warnings.push('Nenhum item encontrado na nota.');
    }

    const duplicatas = toArray(cobr.dup);
    const installments: ParsedInvoiceInstallment[] =
      duplicatas.length > 0
        ? duplicatas.map((dup) => ({
            dueDate:
              toText((dup as Record<string, unknown>).dVenc) ??
              '',
            amount: toNumber(
              (dup as Record<string, unknown>).vDup,
            ),
          }))
        : [];

    return {
      kind: 'NFE',
      party,
      invoiceNumber: toText(ide.nNF),
      invoiceKey: chave,
      invoiceIssueDate: toText(ide.dhEmi) ?? toText(ide.dEmi),
      items,
      totalAmount: icmsTot.vNF ? toNumber(icmsTot.vNF) : null,
      installments,
      grossWeightKg: vol?.pesoB ? toNumber(vol.pesoB) : null,
      netWeightKg: vol?.pesoL ? toNumber(vol.pesoL) : null,
      warnings,
    };
  }

  /**
   * NFS-e não tem layout nacional único — cada prefeitura define o
   * seu. Aqui é melhor esforço: procura os campos mais comuns em
   * qualquer profundidade do XML. O que não achar, a pessoa completa
   * no formulário mesmo.
   */
  private parseNfseBestEffort(
    parsed: Record<string, unknown>,
  ): ParsedInvoice {
    const warnings: string[] = [];

    const document = toText(
      findFirstByKeys(parsed, ['Cnpj', 'CNPJ', 'CpfCnpj']),
    );
    const legalName = toText(
      findFirstByKeys(parsed, [
        'RazaoSocial',
        'RazaoSocialPrestador',
        'Nome',
      ]),
    );

    const party: ParsedInvoiceParty | null =
      document && legalName
        ? {
            document: document.replace(/\D/g, ''),
            legalName,
            tradeName: null,
            email: toText(
              findFirstByKeys(parsed, ['Email']),
            ),
            zipCode: toText(
              findFirstByKeys(parsed, ['Cep', 'CEP']),
            ),
            street: toText(
              findFirstByKeys(parsed, ['Endereco', 'Logradouro']),
            ),
            number: toText(
              findFirstByKeys(parsed, ['Numero', 'NumeroEndereco']),
            ),
            complement: toText(
              findFirstByKeys(parsed, ['Complemento']),
            ),
            district: toText(
              findFirstByKeys(parsed, ['Bairro']),
            ),
            city: toText(
              findFirstByKeys(parsed, ['Cidade', 'Municipio']),
            ),
            state: toText(findFirstByKeys(parsed, ['Uf', 'UF'])),
          }
        : null;

    if (!party) {
      warnings.push(
        'Nota de serviço: não achei todos os dados do prestador automaticamente — confira e complete os campos.',
      );
    }

    const valor = findFirstByKeys(parsed, [
      'ValorServicos',
      'ValorLiquidoNfse',
      'ValorTotal',
    ]);

    const description = toText(
      findFirstByKeys(parsed, ['Discriminacao', 'Descricao']),
    );

    warnings.push(
      'Nota de serviço lida em modo melhor esforço — cada prefeitura tem um layout diferente, confira todos os campos antes de confirmar.',
    );

    return {
      kind: 'NFSE',
      party,
      invoiceNumber: toText(
        findFirstByKeys(parsed, ['Numero', 'NumeroNfse']),
      ),
      invoiceKey: toText(
        findFirstByKeys(parsed, ['CodigoVerificacao']),
      ),
      invoiceIssueDate: toText(
        findFirstByKeys(parsed, ['DataEmissao']),
      ),
      items: description
        ? [
            {
              code: null,
              description,
              ncm: null,
              cfop: null,
              unit: null,
              quantity: 1,
              unitPrice: toNumber(valor),
              totalPrice: toNumber(valor),
              ean: null,
            },
          ]
        : [],
      totalAmount: valor ? toNumber(valor) : null,
      installments: [],
      grossWeightKg: null,
      netWeightKg: null,
      warnings,
    };
  }

  private readParty(
    node: Record<string, unknown>,
  ): ParsedInvoiceParty | null {
    const document = toText(node.CNPJ) ?? toText(node.CPF);
    const legalName = toText(node.xNome);

    if (!document || !legalName) return null;

    const ender = (node.enderEmit ??
      node.enderDest ??
      {}) as Record<string, unknown>;

    return {
      document,
      legalName,
      tradeName: toText(node.xFant),
      email: toText(node.email),
      zipCode: toText(ender.CEP),
      street: toText(ender.xLgr),
      number: toText(ender.nro),
      complement: toText(ender.xCpl),
      district: toText(ender.xBairro),
      city: toText(ender.xMun),
      state: toText(ender.UF),
    };
  }
}
