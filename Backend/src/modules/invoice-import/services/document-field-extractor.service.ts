import { Injectable } from '@nestjs/common';

import { FinancialDocumentType } from '@prisma/client';

import type { ParsedInvoice } from './invoice-xml-parser.service';

/** "1.234,56" ou "1234.56" → 1234.56 (aceita as duas notações, o texto extraído é imprevisível). */
function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '');

  if (!cleaned) return null;

  // Tem vírgula: assume formato BR (ponto = milhar, vírgula = decimal).
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;

  const value = Number(normalized);

  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "DD/MM/AAAA" → "AAAA-MM-DD" (o resto do sistema espera ISO, ver `toDateInput` no frontend). */
function parseBrDate(raw: string): string | null {
  const match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) return null;

  const [, day, month, year] = match;
  const d = day.padStart(2, '0');
  const m = month.padStart(2, '0');

  // Confere que é uma data de verdade, não só 4 números com barra no meio.
  const candidate = new Date(`${year}-${m}-${d}T00:00:00Z`);

  if (Number.isNaN(candidate.getTime())) return null;

  return `${year}-${m}-${d}`;
}

/** Número em formato BR: "91,37", "1.234,56" — a casa decimal com vírgula é o que distingue de um CNPJ/CPF/nº de documento perdido por perto. */
const BRL_NUMBER_PATTERN = /\d{1,3}(?:\.\d{3})*,\d{2}/;
const DATE_BR_PATTERN = /\d{1,2}\/\d{1,2}\/\d{4}/;

/**
 * Rótulos de cada campo, do mais específico pro mais genérico —
 * tentados nessa ordem, o primeiro que achar alguma coisa por perto
 * (ver `findNear`) vence. Layout de documento real não é fiel: o
 * valor quase nunca vem colado no rótulo (às vezes cabeçalho de
 * tabela numa linha, valor de verdade só aparece linhas depois, ou o
 * rótulo tem palavra extra no meio — "Valor **Total do** Documento",
 * por exemplo) — por isso a busca é "ache o rótulo, depois procure o
 * primeiro número/data com essa forma dentro de uma janela de texto
 * depois dele", não um regex único colado.
 */
const VALUE_LABEL_PATTERNS = [
  /valor\s+total\s+do\s+documento/i,
  /valor\s+a\s+pagar/i,
  /valor\s+do\s+documento/i,
  /total\s+a\s+pagar/i,
  /valor\s+cobrado/i,
  /valor\s+total/i,
  /\bvalor\b\s*:/i,
  /\btotal\b\s*:/i,
];

const DUE_DATE_LABEL_PATTERNS = [
  /data\s+de\s+vencimento/i,
  /pagar\s+(este\s+documento\s+)?at[ée]/i,
  /vence\s+em/i,
  /\bvencimento\b/i,
];

const ISSUE_DATE_LABEL_PATTERNS = [
  /data\s+de\s+emiss[aã]o/i,
  /\bemiss[aã]o\b/i,
];

const DOCUMENT_NUMBER_LABEL_PATTERNS = [
  /nosso\s+n[uú]mero/i,
  /n[uú]mero\s+da\s+fatura/i,
  /fatura\s+n[ºo°]?/i,
  /n[ºo°]\s+do\s+documento/i,
  /n[uú]mero\s+do\s+documento/i,
];
const DOCUMENT_NUMBER_VALUE_PATTERN = /[\d][\d./-]{4,}/;

const CNPJ_PATTERN = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/;

/** Linha digitável de boleto bancário: 5 blocos de dígitos (com ou sem os pontos/espaços de exibição). Não cobre código de barras de convênio/arrecadação (DAS, tributos, contas de consumo com "código de barras" de 44 dígitos em 4 blocos) — layout diferente, fica pra uma próxima. */
const DIGITABLE_LINE_PATTERN =
  /\d{5}[.\s]?\d{5}[.\s]?\d{5}[.\s]?\d{6}[.\s]?\d{5}[.\s]?\d{6}[.\s]?\d{1}[.\s]?\d{14}/;

/**
 * Acha a primeira ocorrência de qualquer um dos rótulos e, dentro de
 * uma janela de texto logo depois dele, procura o primeiro trecho no
 * formato esperado (`valuePattern`) — tolera rótulo com palavra extra
 * no meio, quebra de linha entre rótulo e valor, cabeçalho de tabela
 * antes do valor de verdade etc. `windowChars` pequeno de propósito:
 * evita pegar um número de uma seção totalmente diferente do
 * documento só porque o rótulo apareceu antes em algum lugar.
 */
function findNear(
  text: string,
  labelPatterns: RegExp[],
  valuePattern: RegExp,
  windowChars = 60,
): string | null {
  for (const labelPattern of labelPatterns) {
    const labelMatch = text.match(labelPattern);

    if (!labelMatch || labelMatch.index == null) continue;

    const start = labelMatch.index + labelMatch[0].length;
    const window = text.slice(start, start + windowChars);
    const valueMatch = window.match(valuePattern);

    if (valueMatch) return valueMatch[0];
  }

  return null;
}

function guessDocumentType(text: string): FinancialDocumentType {
  const lower = text.toLowerCase();

  if (DIGITABLE_LINE_PATTERN.test(text) || lower.includes('boleto')) {
    return FinancialDocumentType.BOLETO;
  }

  if (
    lower.includes('cupom fiscal') ||
    lower.includes('cfe') ||
    lower.includes('sat ') ||
    lower.includes('nfc-e')
  ) {
    return FinancialDocumentType.CUPOM_FISCAL;
  }

  if (lower.includes('fatura') || lower.includes('conta de')) {
    return FinancialDocumentType.FATURA;
  }

  return FinancialDocumentType.OUTRO;
}

/** Rótulos puros (ex.: "CNPJ:") que não servem como nome — quando a linha do CNPJ é só isso, o nome está na linha anterior. */
const LABEL_ONLY_LINE_PATTERN = /^(cnpj|cpf|cnpj\/cpf|documento)\s*:?\s*$/i;

/** Tenta pegar a linha mais próxima do CNPJ como nome do emissor — best-effort, sem estrutura confiável pra confiar 100%. */
function guessPartyName(text: string, documentIndex: number): string {
  const before = text.slice(0, documentIndex);
  const lines = before.split(/\r?\n/);

  // A linha que contém o CNPJ pode ser só o rótulo ("CNPJ: 12.345...")
  // sem nome nenhum — nesse caso o nome está na linha de cima
  // ("Beneficiário: Empresa Tal"). Sobe até achar uma linha com
  // conteúdo que não seja só o rótulo.
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 5; i--) {
    const candidate = lines[i]
      .replace(CNPJ_PATTERN, '')
      .replace(CPF_PATTERN, '')
      .trim();

    if (candidate && !LABEL_ONLY_LINE_PATTERN.test(candidate)) {
      return candidate.slice(0, 150);
    }
  }

  return 'Emitente não identificado';
}

/**
 * Extrai os campos de `ParsedInvoice` a partir de texto livre (PDF
 * com camada de texto, ou resultado de OCR) — pensado pra boleto,
 * fatura, conta de consumo (água/luz/telefone) e cupom fiscal, os
 * documentos que não têm layout XML nacional como a NF-e/NFS-e.
 *
 * "Melhor esforço" no mesmo espírito de `parseNfseBestEffort`: nunca
 * lança erro por campo não encontrado, só registra em `warnings` —
 * quem usa sempre revisa antes de confirmar (ver
 * `InvoiceImportModal.tsx`), então um campo em branco não trava nada.
 */
@Injectable()
export class DocumentFieldExtractorService {
  extractFields(rawText: string): ParsedInvoice {
    const warnings: string[] = [];

    const totalAmountRaw = findNear(
      rawText,
      VALUE_LABEL_PATTERNS,
      BRL_NUMBER_PATTERN,
    );
    const totalAmount = totalAmountRaw ? parseMoney(totalAmountRaw) : null;

    if (totalAmount == null) {
      warnings.push('Não encontrei o valor — confira e preencha na mão.');
    }

    const dueDateRaw = findNear(
      rawText,
      DUE_DATE_LABEL_PATTERNS,
      DATE_BR_PATTERN,
    );
    const dueDate = dueDateRaw ? parseBrDate(dueDateRaw) : null;

    if (!dueDate) {
      warnings.push('Não encontrei o vencimento — confira e preencha na mão.');
    }

    const issueDateRaw = findNear(
      rawText,
      ISSUE_DATE_LABEL_PATTERNS,
      DATE_BR_PATTERN,
    );
    const issueDate = issueDateRaw ? parseBrDate(issueDateRaw) : null;

    const documentNumber = findNear(
      rawText,
      DOCUMENT_NUMBER_LABEL_PATTERNS,
      DOCUMENT_NUMBER_VALUE_PATTERN,
      30,
    );

    const digitableLineMatch = rawText.match(DIGITABLE_LINE_PATTERN);
    const digitableLine = digitableLineMatch
      ? digitableLineMatch[0].replace(/\s+/g, ' ').trim()
      : null;

    const documentMatch =
      rawText.match(CNPJ_PATTERN) ?? rawText.match(CPF_PATTERN);

    let party: ParsedInvoice['party'] = null;

    if (documentMatch) {
      party = {
        document: documentMatch[0].replace(/\D/g, ''),
        legalName: guessPartyName(rawText, documentMatch.index ?? 0),
        tradeName: null,
        email: null,
        zipCode: null,
        street: null,
        number: null,
        complement: null,
        district: null,
        city: null,
        state: null,
      };
    } else {
      warnings.push(
        'Não encontrei o CNPJ/CPF do emissor — selecione o parceiro na mão.',
      );
    }

    return {
      kind: 'DOCUMENT',
      party,
      invoiceNumber: documentNumber,
      invoiceKey: digitableLine,
      invoiceIssueDate: issueDate,
      items: [],
      totalAmount,
      installments:
        dueDate && totalAmount != null
          ? [{ dueDate, amount: totalAmount }]
          : [],
      grossWeightKg: null,
      netWeightKg: null,
      referencedOrderNumber: null,
      suggestedDocumentType: guessDocumentType(rawText),
      warnings,
    };
  }
}
