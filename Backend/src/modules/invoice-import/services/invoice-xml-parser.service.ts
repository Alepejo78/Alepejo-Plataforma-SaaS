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
  /**
   * Número do Pedido de Compra/Venda ("PC-000123"/"PV-000045")
   * referenciado nas informações complementares da nota, ou no campo
   * padrão `xPed` de algum item — é o número que o e-mail automático
   * de escolha de vencedor da Cotação pede pro fornecedor informar.
   * `null` quando a nota não referencia nenhum pedido.
   */
  referencedOrderNumber: number | null;
  /** Campos que o layout não trouxe — a tela pede pra completar. */
  warnings: string[];
}

/** Aceita "PC-000123", "PC 123", "PV-000045" etc. — número após o prefixo, com ou sem zeros à esquerda. */
const ORDER_REFERENCE_PATTERN = /P[CV][-\s]?0*(\d+)/i;

/**
 * Procura o número do pedido primeiro no texto livre das informações
 * complementares (onde o e-mail da Cotação pede pro fornecedor
 * informar), e só depois no campo padrão `xPed` de cada item (que
 * alguns sistemas de fornecedor preenchem em vez do texto livre).
 */
function extractReferencedOrderNumber(
  infCpl: string | null,
  itemXPeds: (string | null)[],
): number | null {
  const fromText = infCpl?.match(ORDER_REFERENCE_PATTERN);

  if (fromText) {
    const n = Number(fromText[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  for (const xPed of itemXPeds) {
    if (!xPed) continue;

    const match =
      xPed.match(ORDER_REFERENCE_PATTERN) ?? xPed.match(/^0*(\d+)$/);

    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  return null;
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
 *
 * `preferLeaf`: alguns layouts (ABRASF) usam o mesmo nome tanto pro
 * campo-contêiner quanto, indiretamente, pro valor de verdade — ex.:
 * `CpfCnpj` é um objeto `{ Cnpj: "123..." }`, não o número em si. Com
 * `preferLeaf`, um match que caiu num objeto não é aceito: desce nele
 * procurando as mesmas chaves de novo, só devolvendo texto/número de
 * verdade (ou nada, se não achar). Sem isso (uso continua sendo o
 * padrão), o comportamento é o de sempre — devolve o que achar,
 * objeto ou não, usado quando o objeto é o que se quer mesmo (ex.:
 * achar o nó inteiro `PrestadorServico`).
 */
function findFirstByKeys(
  node: unknown,
  keys: string[],
  depth = 0,
  preferLeaf = false,
): unknown {
  if (depth > 12 || node === null || typeof node !== 'object') {
    return undefined;
  }

  const lowerKeys = keys.map((k) => k.toLowerCase());

  for (const [key, value] of Object.entries(
    node as Record<string, unknown>,
  )) {
    if (lowerKeys.includes(key.toLowerCase())) {
      if (preferLeaf && value !== null && typeof value === 'object') {
        const nested = findFirstByKeys(
          value,
          keys,
          depth + 1,
          preferLeaf,
        );
        if (nested !== undefined) return nested;
        continue;
      }

      return value;
    }
  }

  for (const value of Object.values(
    node as Record<string, unknown>,
  )) {
    if (value && typeof value === 'object') {
      const found = findFirstByKeys(value, keys, depth + 1, preferLeaf);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

@Injectable()
export class InvoiceXmlParserService {
  /**
   * Confere se a nota realmente é da empresa (ou de alguma do mesmo
   * grupo) antes de aceitar qualquer coisa — nunca confia cegamente
   * na tela de onde o upload veio. Remetente (emitente/Prestador) com
   * CNPJ/CPF da empresa = venda (a nota é nossa, saindo); destinatário
   * (Tomador) com CNPJ/CPF da empresa = compra (a nota é de fora,
   * entrando). Nenhum dos dois bater = a nota não pertence à empresa,
   * rejeita; bater o lado errado do que a tela esperava (ex.: nota de
   * venda importada em Compras), rejeita também, com mensagem clara.
   */
  private assertBelongsToCompany(
    senderDoc: string | null,
    recipientDoc: string | null,
    companyDocuments: Set<string>,
    direction: 'PURCHASE' | 'SALE',
  ): void {
    const senderIsUs = Boolean(
      senderDoc && companyDocuments.has(senderDoc),
    );
    const recipientIsUs = Boolean(
      recipientDoc && companyDocuments.has(recipientDoc),
    );

    if (!senderIsUs && !recipientIsUs) {
      throw new BadRequestException(
        'Esta nota não referencia o CNPJ/CPF da sua empresa nem de nenhuma empresa do grupo — não é possível importar.',
      );
    }

    const detected: 'PURCHASE' | 'SALE' = senderIsUs
      ? 'SALE'
      : 'PURCHASE';

    if (detected !== direction) {
      throw new BadRequestException(
        detected === 'SALE'
          ? 'Esta nota foi emitida pela sua empresa — é uma venda. Importe pela tela de Vendas.'
          : 'Esta nota foi emitida para a sua empresa — é uma compra. Importe pela tela de Compras.',
      );
    }
  }

  /**
   * `direction` diz de qual lado é "o outro parceiro" na nota — NF-e
   * sempre tem emitente (quem vendeu) e destinatário (quem comprou);
   * comprando, o fornecedor é quem emitiu; vendendo (nota que a
   * própria empresa emitiu e está importando de volta), o cliente é o
   * destinatário. `companyDocuments` são os CNPJ/CPF da empresa e de
   * todo o grupo (Interprise) — usados por `assertBelongsToCompany`
   * pra confirmar que a nota é mesmo da empresa antes de aceitar.
   */
  parse(
    xml: string,
    companyDocuments: Set<string>,
    direction: 'PURCHASE' | 'SALE' = 'PURCHASE',
  ): ParsedInvoice {
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
      return this.parseNfe(
        infNFe as Record<string, unknown>,
        companyDocuments,
        direction,
      );
    }

    return this.parseNfseBestEffort(parsed, companyDocuments, direction);
  }

  private parseNfe(
    infNFe: Record<string, unknown>,
    companyDocuments: Set<string>,
    direction: 'PURCHASE' | 'SALE',
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
    const infAdic = (infNFe.infAdic ?? {}) as Record<
      string,
      unknown
    >;

    const warnings: string[] = [];

    const emitDoc =
      (toText(emit.CNPJ) ?? toText(emit.CPF))?.replace(/\D/g, '') ??
      null;
    const destDoc =
      (toText(dest.CNPJ) ?? toText(dest.CPF))?.replace(/\D/g, '') ??
      null;

    this.assertBelongsToCompany(
      emitDoc,
      destDoc,
      companyDocuments,
      direction,
    );

    // Comprando: o fornecedor é quem emitiu a nota (emit). Vendendo:
    // é a própria nota que a empresa emitiu, então o cliente é o
    // destinatário (dest) — nunca o emitente, que é ela mesma.
    const party =
      direction === 'PURCHASE'
        ? this.readParty(emit) ?? this.readParty(dest)
        : this.readParty(dest) ?? this.readParty(emit);

    if (!party) {
      warnings.push(
        'Não achei os dados do fornecedor/cliente na nota — preencha na mão.',
      );
    }

    const detNodes = toArray(infNFe.det);

    const items: ParsedInvoiceItem[] = detNodes.map((det) => {
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

    const referencedOrderNumber = extractReferencedOrderNumber(
      toText(infAdic.infCpl),
      detNodes.map((det) =>
        toText(
          ((det as Record<string, unknown>).prod as
            | Record<string, unknown>
            | undefined)?.xPed,
        ),
      ),
    );

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
      referencedOrderNumber,
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
    companyDocuments: Set<string>,
    direction: 'PURCHASE' | 'SALE',
  ): ParsedInvoice {
    const warnings: string[] = [];

    /*
     * Layout ABRASF (a maioria das prefeituras) tem nós dedicados
     * PrestadorServico/TomadorServico — busca escopada a um deles
     * evita pegar campo do lado errado (ex.: nota com Prestador só
     * com NomeFantasia, sem RazaoSocial — busca livre no documento
     * inteiro "escapava" pro Tomador atrás do nome, mas o CNPJ batia
     * certo com o Prestador: uma mistura dos dois lados errada).
     * Comprando, o fornecedor é o Prestador; vendendo (nota emitida
     * pela própria empresa), o cliente é o Tomador. Sem os nós
     * dedicados (layout mais simples/antigo), cai pra busca livre no
     * documento inteiro, igual antes.
     */
    const prestadorNode = findFirstByKeys(parsed, [
      'PrestadorServico',
      'Prestador',
    ]) as Record<string, unknown> | undefined;
    const tomadorNode = findFirstByKeys(parsed, [
      'TomadorServico',
      'Tomador',
    ]) as Record<string, unknown> | undefined;

    // Só dá pra confirmar de quem é a nota quando o layout tem os nós
    // dedicados — sem eles, cai no melhor esforço de sempre, sem essa
    // checagem (não dá pra saber com segurança qual lado é qual).
    if (prestadorNode || tomadorNode) {
      const prestadorDoc = prestadorNode
        ? toText(
            findFirstByKeys(
              prestadorNode,
              ['Cnpj', 'CNPJ', 'CpfCnpj', 'Cpf'],
              0,
              true,
            ),
          )?.replace(/\D/g, '') ?? null
        : null;
      const tomadorDoc = tomadorNode
        ? toText(
            findFirstByKeys(
              tomadorNode,
              ['Cnpj', 'CNPJ', 'CpfCnpj', 'Cpf'],
              0,
              true,
            ),
          )?.replace(/\D/g, '') ?? null
        : null;

      this.assertBelongsToCompany(
        prestadorDoc,
        tomadorDoc,
        companyDocuments,
        direction,
      );
    }

    const relevantNode: Record<string, unknown> =
      (direction === 'PURCHASE'
        ? prestadorNode ?? tomadorNode
        : tomadorNode ?? prestadorNode) ?? parsed;

    const document = toText(
      findFirstByKeys(
        relevantNode,
        ['Cnpj', 'CNPJ', 'CpfCnpj', 'Cpf'],
        0,
        true,
      ),
    );
    const legalName = toText(
      findFirstByKeys(
        relevantNode,
        ['RazaoSocial', 'RazaoSocialPrestador', 'NomeFantasia', 'Nome'],
        0,
        true,
      ),
    );

    const party: ParsedInvoiceParty | null =
      document && legalName
        ? {
            document: document.replace(/\D/g, ''),
            legalName,
            tradeName: null,
            email: toText(
              findFirstByKeys(relevantNode, ['Email'], 0, true),
            ),
            zipCode: toText(
              findFirstByKeys(relevantNode, ['Cep', 'CEP'], 0, true),
            ),
            // "Endereco" nomeia tanto o objeto do endereço quanto,
            // dentro dele, o nome da rua (layout ABRASF) — busca
            // genérica pegaria o objeto inteiro. `Logradouro` primeiro
            // (sem ambiguidade); só então o `Endereco.Endereco`
            // aninhado especificamente.
            street: toText(
              findFirstByKeys(relevantNode, ['Logradouro'], 0, true) ??
                (
                  relevantNode.Endereco as
                    | Record<string, unknown>
                    | undefined
                )?.Endereco,
            ),
            number: toText(
              findFirstByKeys(
                relevantNode,
                ['Numero', 'NumeroEndereco'],
                0,
                true,
              ),
            ),
            complement: toText(
              findFirstByKeys(relevantNode, ['Complemento'], 0, true),
            ),
            district: toText(
              findFirstByKeys(relevantNode, ['Bairro'], 0, true),
            ),
            city: toText(
              findFirstByKeys(
                relevantNode,
                ['Cidade', 'Municipio'],
                0,
                true,
              ),
            ),
            state: toText(
              findFirstByKeys(relevantNode, ['Uf', 'UF'], 0, true),
            ),
          }
        : null;

    if (!party) {
      warnings.push(
        direction === 'PURCHASE'
          ? 'Nota de serviço: não achei todos os dados do prestador automaticamente — confira e complete os campos.'
          : 'Nota de serviço: não achei todos os dados do tomador automaticamente — confira e complete os campos.',
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

    const referencedOrderNumber = extractReferencedOrderNumber(
      description,
      [],
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
      referencedOrderNumber,
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
