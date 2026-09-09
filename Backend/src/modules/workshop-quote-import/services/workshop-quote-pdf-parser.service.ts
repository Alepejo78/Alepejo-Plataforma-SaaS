import { Injectable } from '@nestjs/common';

import { PaymentMethod } from '@prisma/client';

const MONEY_PATTERN = /\d{1,3}(?:\.\d{3})*,\d{2}/;
/// Mesmo formato de valor, mas ignora o número quando ele é, na
/// verdade, um percentual de desconto ("10,00%") — alguns orçamentos
/// trazem uma coluna "% Desconto" entre Bruto e Líquido, e sem esse
/// filtro esse número entraria na conta como se fosse mais um valor.
const MONEY_NOT_PERCENT_PATTERN = /\d{1,3}(?:\.\d{3})*,\d{2}(?!\s*%)/g;
const PART_QTY_PATTERN = /^\d+,\d{3}$/;
const CODE_FIELD_PATTERN = /^\d{4,8}$/;

/**
 * Bruto e líquido de uma linha, buscados por MAGNITUDE (maior =
 * bruto, menor/igual = líquido) em vez de posição — a ordem em que
 * `pdf-parse` devolve essas duas colunas varia de um modelo de
 * orçamento pra outro (já vimos as duas ordens em exports reais da
 * Fazam Car), então a posição não é confiável; o valor sempre é
 * (bruto ≥ líquido é a única invariante certa aqui — desconto só
 * reduz, nunca aumenta).
 */
function extractGrossAndNet(text: string): { gross: number; net: number } | null {
  const values = [...text.matchAll(MONEY_NOT_PERCENT_PATTERN)].map((m) =>
    toNumber(m[0]),
  );

  if (values.length === 0) return null;

  return { gross: Math.max(...values), net: Math.min(...values) };
}

export interface ParsedWorkshopQuoteItem {
  kind: 'PART' | 'SERVICE';
  code: string;
  description: string;
  /// Sempre "UN" pra serviço (a planilha da oficina não tem coluna de
  /// unidade nessa tabela) — só peça traz a unidade de verdade.
  unit: string;
  quantity: number;
  grossValue: number;
  netValue: number;
}

export interface ParsedWorkshopQuote {
  documentNumber: string | null;
  issueDate: string | null;
  partner: {
    document: string | null;
    legalName: string | null;
    phone: string | null;
    mobile: string | null;
    zipCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    city: string | null;
    state: string | null;
  };
  items: ParsedWorkshopQuoteItem[];
  paymentMethodText: string | null;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  termDays: number;
  totalAmount: number | null;
  warnings: string[];
}

function toNumber(raw: string): number {
  return Number(raw.replace(/\./g, '').replace(',', '.'));
}

/// Linha de cabeçalho da tabela ("Código"/"Descrição" entre os campos
/// da própria planilha) — a ordem E o agrupamento das colunas nesse
/// cabeçalho variam conforme o export (às vezes "Descrição" vem
/// colada com outra palavra no mesmo campo de TAB), então não dá pra
/// checar por campo inteiro nem por prefixo fixo; basta conferir se
/// os rótulos aparecem em algum lugar da linha.
function isTableHeaderRow(fields: string[]): boolean {
  const joined = fields.join(' ');
  return /Código/i.test(joined) && /(Descrição|Líquido|Bruto)/i.test(joined);
}

function findLine(
  lines: string[],
  pattern: RegExp,
): RegExpMatchArray | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match;
  }
  return null;
}

function parseBrDateToIso(raw: string): string | null {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/// Texto livre → forma de pagamento do sistema. "A Vista"/vazio cai
/// em DINHEIRO (única opção plausível quando o orçamento não diz qual
/// meio eletrônico foi usado).
function guessPaymentMethod(text: string): PaymentMethod {
  const upper = text.toUpperCase();

  if (upper.includes('PIX')) return PaymentMethod.PIX;
  if (upper.includes('BOLETO')) return PaymentMethod.BOLETO;
  if (upper.includes('TRANSFER')) return PaymentMethod.TRANSFERENCIA;
  if (upper.includes('DEPOSIT') || upper.includes('DEPÓSIT'))
    return PaymentMethod.DEPOSITO;
  if (upper.includes('CHEQUE')) return PaymentMethod.CHEQUE;
  if (
    upper.includes('CRÉDITO') ||
    upper.includes('CREDITO') ||
    upper.includes('CARTÃO C') ||
    upper.includes('CARTAO C')
  )
    return PaymentMethod.CREDITO;
  if (
    upper.includes('DÉBITO') ||
    upper.includes('DEBITO') ||
    upper.includes('CARTÃO D') ||
    upper.includes('CARTAO D')
  )
    return PaymentMethod.DEBITO;

  return PaymentMethod.DINHEIRO;
}

/**
 * Extrai o código (4 a 8 dígitos) e o número da parcela de um campo
 * onde os dois vieram colados sem separador nenhum (ex.: "0071851" =
 * código "007185" + item "1") — só acontece na tabela de Peças, cujo
 * layout impresso não deixa espaço entre as duas colunas quando o
 * texto é extraído do PDF. Corta sempre nos últimos 6 dígitos como
 * código (convenção observada no export da oficina — Peças e Serviços
 * usam código de 6 dígitos) e sobra o resto como número do item.
 */
function splitCodeAndItemNumber(raw: string): {
  code: string;
  itemNumber: string;
} {
  if (raw.length <= 6) {
    return { code: raw, itemNumber: '' };
  }
  return { code: raw.slice(0, 6), itemNumber: raw.slice(6) };
}

/**
 * Parser dedicado ao layout de orçamento gerado pelo sistema de
 * gestão de oficina da Fazam Car (motor de relatório "Certtus") — não
 * é um extrator genérico de PDF (ver `DocumentFieldExtractorService`,
 * usado pra boleto/fatura/cupom). Calibrado linha a linha contra a
 * saída real do `pdf-parse` pra este modelo específico de documento
 * (texto sai com colunas fora de ordem e campos separados por TAB,
 * bem diferente da leitura visual do PDF) — ver
 * `docs/09-Layout-Orcamento-Oficina.md` seria o lugar de documentar
 * isso se um segundo modelo aparecer.
 *
 * Nunca lança erro por campo não encontrado — junta em `warnings` e
 * deixa nulo/vazio; a tela de importação sempre exige revisão humana
 * antes de confirmar (mesmo espírito do resto dos importadores).
 */
@Injectable()
export class WorkshopQuotePdfParserService {
  parse(rawText: string): ParsedWorkshopQuote {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim());
    const warnings: string[] = [];

    const documentNumberMatch = findLine(lines, /ORÇAMENTO\s+(\S+)/i);
    const documentNumber = documentNumberMatch?.[1] ?? null;
    if (!documentNumber) {
      warnings.push('Não encontrei o número do orçamento.');
    }

    const issueDateMatch = findLine(
      lines,
      /Abertura:\s*(\d{2}\/\d{2}\/\d{4})/i,
    );
    const issueDate = issueDateMatch
      ? parseBrDateToIso(issueDateMatch[1])
      : null;
    if (!issueDate) {
      warnings.push('Não encontrei a data de abertura.');
    }

    const partner = this.parsePartner(lines, warnings);

    const items: ParsedWorkshopQuoteItem[] = [
      ...this.parsePartItems(lines, warnings),
      ...this.parseServiceItems(lines, warnings),
    ];

    if (items.length === 0) {
      warnings.push(
        'Não encontrei nenhum item de peça/serviço — confira o arquivo.',
      );
    }

    const paymentLineMatch = findLine(
      lines,
      /Forma de pagamento:\s*(.+)/i,
    );
    const paymentMethodText = paymentLineMatch?.[1]?.trim() ?? null;
    const paymentMethod = guessPaymentMethod(paymentMethodText ?? '');

    const installmentsMatch = findLine(
      lines,
      /Condição de pagamento:.*?(\d+)\s*x\s*\d{1,3}(?:\.\d{3})*,\d{2}/i,
    );
    const installmentsCount = installmentsMatch
      ? Number(installmentsMatch[1])
      : 1;

    // Sem informação de prazo entre parcelas no orçamento — só o "à
    // vista" (vence no lançamento) é confiável; a prazo assume 30 dias
    // entre parcelas, mesmo padrão default usado no resto do sistema.
    const isAVista =
      (paymentMethodText ?? '').toUpperCase().includes('VISTA') ||
      installmentsCount <= 1;
    const termDays = isAVista ? 0 : 30;

    // "Total geral:" e o valor podem vir em qualquer ordem na mesma
    // linha (pdf-parse não preserva a ordem visual das colunas nesta
    // exportação — ver comentário da classe).
    const totalLine = lines.find((l) => /Total geral/i.test(l));
    const totalMoneyMatch = totalLine?.match(MONEY_PATTERN);
    const totalAmount = totalMoneyMatch ? toNumber(totalMoneyMatch[0]) : null;

    return {
      documentNumber,
      issueDate,
      partner,
      items,
      paymentMethodText,
      paymentMethod,
      installmentsCount,
      termDays,
      totalAmount,
      warnings,
    };
  }

  private parsePartner(
    lines: string[],
    warnings: string[],
  ): ParsedWorkshopQuote['partner'] {
    const headerIndex = lines.findIndex(
      (l) => l === 'Identificação do Destinatário',
    );

    if (headerIndex === -1 || !lines[headerIndex + 1]) {
      warnings.push('Não encontrei os dados do cliente.');
      return {
        document: null,
        legalName: null,
        phone: null,
        mobile: null,
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        city: null,
        state: null,
      };
    }

    const nameLine = lines[headerIndex + 1] ?? '';
    const addressLine = lines[headerIndex + 2] ?? '';
    const phoneLine = lines[headerIndex + 3] ?? '';

    const nameMatch = nameLine.match(
      /^(.+?)\s*-\s*CPF\/CNPJ:\s*([\d./-]+)/i,
    );
    const legalName = nameMatch?.[1]?.trim() ?? null;
    const document = nameMatch?.[2]?.replace(/\D/g, '') ?? null;

    if (!document) {
      warnings.push('Não encontrei o CPF/CNPJ do cliente.');
    }

    // "RUA X 164 - COMPLEMENTO - CIDADE - UF - CEP"
    const addressParts = addressLine.split(' - ').map((p) => p.trim());
    let street: string | null = null;
    let number: string | null = null;
    let complement: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let zipCode: string | null = null;

    if (addressParts.length >= 4) {
      const streetAndNumber = addressParts[0];
      const streetMatch = streetAndNumber.match(/^(.+?)\s+(\d+[A-Za-z]?)$/);
      street = streetMatch ? streetMatch[1].trim() : streetAndNumber;
      number = streetMatch ? streetMatch[2] : null;

      // 5 blocos = tem complemento; 4 blocos = não tem.
      if (addressParts.length >= 5) {
        complement = addressParts[1];
        city = addressParts[2];
        state = addressParts[3];
        zipCode = addressParts[4]?.replace(/\D/g, '') || null;
      } else {
        city = addressParts[1];
        state = addressParts[2];
        zipCode = addressParts[3]?.replace(/\D/g, '') || null;
      }
    } else {
      warnings.push(
        'Não consegui separar o endereço do cliente — confira na mão.',
      );
    }

    const phones = phoneLine
      .split(' - ')
      .map((p) => p.trim())
      .filter(Boolean);

    return {
      document,
      legalName,
      phone: phones[0] ?? null,
      mobile: phones[1] ?? null,
      zipCode,
      street,
      number,
      complement,
      city,
      state: state?.slice(0, 2) ?? null,
    };
  }

  /**
   * Linha de item de peça, já extraída do `pdf-parse` — campos
   * separados por TAB, com bruto/líquido/unidade tanto em campos
   * próprios quanto colados num só, dependendo do modelo do
   * orçamento (dois formatos reais já vistos nos exports da Fazam
   * Car). Por isso bruto/líquido são extraídos por MAGNITUDE, não por
   * posição (ver `extractGrossAndNet`), e a unidade por token isolado
   * de 1-6 letras maiúsculas em vez de campo inteiro.
   */
  private parsePartItems(
    lines: string[],
    warnings: string[],
  ): ParsedWorkshopQuoteItem[] {
    const start = lines.findIndex((l) => l === 'Peças');
    // "Serviços" só existe quando o orçamento tem serviço também — sem
    // ele, parar em "Total de Peças" evita varrer até o rodapé da
    // página (paginação etc.) atrás de mais linhas de item.
    const end = lines.findIndex(
      (l, i) =>
        i > start && (l === 'Serviços' || /Total de Peças/i.test(l)),
    );

    if (start === -1) return [];

    const section = lines.slice(
      start + 1,
      end === -1 ? undefined : end,
    );

    const items: ParsedWorkshopQuoteItem[] = [];

    for (const line of section) {
      if (!line.includes('\t')) continue;
      // "Total: 100,00" ou, com a ordem das colunas invertida,
      // "100,00\tTotal de Peças:" — não é linha de item nos dois casos.
      if (/\bTotal\b/i.test(line)) continue;

      const fields = line.split('\t').map((f) => f.trim());
      if (isTableHeaderRow(fields)) continue;

      const codeFieldIndex = fields.findIndex((f) =>
        CODE_FIELD_PATTERN.test(f),
      );

      if (codeFieldIndex === -1) {
        warnings.push(`Não entendi esta linha de peça: "${line}".`);
        continue;
      }

      const fieldsBeforeCode = fields.slice(0, codeFieldIndex);
      const itemDescQtyField =
        fields[codeFieldIndex + 1] ?? fields[fields.length - 1];

      const tokensBeforeCode = fieldsBeforeCode.join(' ').split(/\s+/);
      const unit =
        tokensBeforeCode.find((t) => /^[A-ZÀ-Ú]{1,6}$/.test(t)) ?? 'UN';

      const values = extractGrossAndNet(fieldsBeforeCode.join(' '));

      if (!values) {
        warnings.push(`Não achei o valor da peça "${fields[codeFieldIndex]}".`);
        continue;
      }

      const { gross: grossValue, net: netValue } = values;

      const { code, itemNumber: _itemNumber } = splitCodeAndItemNumber(
        fields[codeFieldIndex],
      );

      const qtyMatch = itemDescQtyField.match(PART_QTY_PATTERN)
        ? itemDescQtyField
        : itemDescQtyField
            .split(' ')
            .find((token) => PART_QTY_PATTERN.test(token));

      const quantity = qtyMatch ? toNumber(qtyMatch) : 1;

      const description = itemDescQtyField
        .replace(/^\d+\s+/, '')
        .replace(qtyMatch ?? '', '')
        .trim();

      items.push({
        kind: 'PART',
        code,
        description: description || fields[codeFieldIndex],
        unit,
        quantity,
        grossValue,
        netValue,
      });
    }

    return items;
  }

  /**
   * Linha de item de serviço, já extraída do `pdf-parse` — dois campos
   * separados por TAB: o primeiro traz código e todos os números
   * colados por espaço (não por TAB), o segundo é a descrição pura.
   * Ordem real dos números depois do código: quantidade (sempre
   * "0,00", não usada nessa tabela), tempo, bruto, líquido — ex.:
   * "000227 0,00 1,00 300,00 300,00\tPLAINA DO CABECOTE". Sem coluna
   * de unidade — usa sempre "UN" e a quantidade do item é o "Tempo".
   */
  private parseServiceItems(
    lines: string[],
    warnings: string[],
  ): ParsedWorkshopQuoteItem[] {
    const start = lines.findIndex((l) => l === 'Serviços');
    const end = lines.findIndex((l) => l.startsWith('Valor total de peças'));

    if (start === -1) return [];

    const section = lines.slice(
      start + 1,
      end === -1 ? undefined : end,
    );

    const items: ParsedWorkshopQuoteItem[] = [];

    for (const line of section) {
      if (!line.includes('\t')) continue;
      // "Total: 100,00" ou, com a ordem das colunas invertida,
      // "100,00\tTotal de Peças:" — não é linha de item nos dois casos.
      if (/\bTotal\b/i.test(line)) continue;

      const fields = line.split('\t').map((f) => f.trim());
      if (isTableHeaderRow(fields)) continue;

      const firstField = fields[0];
      const description = fields[fields.length - 1];

      const codeMatch = firstField.match(/^(\d{4,8})\b/);

      if (!codeMatch) {
        warnings.push(`Não entendi esta linha de serviço: "${line}".`);
        continue;
      }

      const code = codeMatch[1];

      // Full match (não substring) pra não confundir um "10,00%" de
      // desconto com valor de verdade, se um dia aparecer nessa
      // tabela também.
      const numberTokens = firstField
        .slice(codeMatch[0].length)
        .trim()
        .split(/\s+/)
        .filter((token) => /^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(token));

      if (numberTokens.length === 0) {
        warnings.push(`Não achei o valor do serviço "${code}".`);
        continue;
      }

      // Bruto e líquido são sempre os dois últimos números — por
      // magnitude, não por posição entre os dois (bruto ≥ líquido é a
      // única ordem confiável). Quantidade (não usada nessa tabela)
      // vem antes deles, se houver.
      const last = toNumber(numberTokens[numberTokens.length - 1]);
      const secondLast =
        numberTokens.length >= 2
          ? toNumber(numberTokens[numberTokens.length - 2])
          : last;
      const grossValue = Math.max(last, secondLast);
      const netValue = Math.min(last, secondLast);
      // Tempo é o terceiro número a partir do fim (quando presente).
      const tempo =
        numberTokens.length >= 3
          ? toNumber(numberTokens[numberTokens.length - 3])
          : 1;

      items.push({
        kind: 'SERVICE',
        code,
        description: description || firstField,
        unit: 'UN',
        quantity: tempo > 0 ? tempo : 1,
        grossValue,
        netValue,
      });
    }

    return items;
  }
}
