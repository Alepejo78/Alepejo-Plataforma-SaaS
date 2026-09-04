import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';

export interface SpreadsheetData {
  headers: string[];
  rows: string[][];
}

/** CSV com `;` (padrão do exportador do sistema) — aceita BOM opcional. */
function parseCsv(buffer: Buffer): SpreadsheetData {
  let text = buffer.toString('utf-8');

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const lines = text
    .split(/\r\n|\n/)
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new BadRequestException('Planilha vazia.');
  }

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ';') {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);

    return cells;
  };

  const [headerLine, ...rowLines] = lines;

  return {
    headers: parseLine(headerLine).map((h) => h.trim()),
    rows: rowLines.map(parseLine),
  };
}

async function parseXlsx(buffer: Buffer): Promise<SpreadsheetData> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new BadRequestException('Planilha vazia.');
  }

  const allRows: string[][] = [];

  sheet.eachRow((row) => {
    const cells: string[] = [];
    const cellCount = Math.max(row.cellCount, row.values ? (row.values as unknown[]).length - 1 : 0);

    for (let col = 1; col <= cellCount; col++) {
      const cell = row.getCell(col);
      const value = cell.value;

      if (value === null || value === undefined) {
        cells.push('');
      } else if (value instanceof Date) {
        cells.push(value.toISOString().slice(0, 10));
      } else if (typeof value === 'object' && 'text' in (value as unknown as Record<string, unknown>)) {
        cells.push(String((value as unknown as { text: unknown }).text ?? ''));
      } else if (typeof value === 'object' && 'result' in (value as unknown as Record<string, unknown>)) {
        cells.push(String((value as unknown as { result: unknown }).result ?? ''));
      } else {
        cells.push(String(value).trim());
      }
    }

    allRows.push(cells);
  });

  const nonEmptyRows = allRows.filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );

  if (nonEmptyRows.length === 0) {
    throw new BadRequestException('Planilha vazia.');
  }

  const [headerRow, ...dataRows] = nonEmptyRows;

  return {
    headers: headerRow.map((h) => h.trim()),
    rows: dataRows,
  };
}

/** Lê `.xlsx` ou `.csv` e devolve cabeçalho + linhas cruas (texto). */
export async function readSpreadsheet(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<SpreadsheetData> {
  const isXlsx =
    filename.toLowerCase().endsWith('.xlsx') ||
    mimetype.includes('spreadsheetml');

  const isCsv =
    filename.toLowerCase().endsWith('.csv') || mimetype.includes('csv');

  if (isXlsx) {
    return parseXlsx(buffer);
  }

  if (isCsv) {
    return parseCsv(buffer);
  }

  throw new BadRequestException(
    'Formato não suportado — envie um arquivo .xlsx ou .csv.',
  );
}

/**
 * Monta um mapa `nomeDoCampo -> índice da coluna` casando o cabeçalho
 * da planilha (livre, sem acento/maiúscula obrigatórios) com as chaves
 * esperadas — ex.: header "Código*" casa com a chave "codigo".
 */
export function mapHeaders(
  headers: string[],
  expectedKeys: string[],
): Map<string, number> {
  const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  const normalize = (value: string) => {
    const stripped = value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

    return stripped
      .split(/[^a-z0-9]+/)
      .filter((word) => word && !STOPWORDS.has(word))
      .join('');
  };

  const normalizedHeaders = headers.map(normalize);
  const map = new Map<string, number>();

  for (const key of expectedKeys) {
    const normalizedKey = normalize(key);
    const index = normalizedHeaders.indexOf(normalizedKey);

    if (index >= 0) {
      map.set(key, index);
    }
  }

  return map;
}

/** Lê o valor de uma linha pra uma chave mapeada, já sem espaços nas pontas. */
export function cellValue(
  row: string[],
  map: Map<string, number>,
  key: string,
): string {
  const index = map.get(key);

  if (index === undefined) {
    return '';
  }

  return (row[index] ?? '').trim();
}
