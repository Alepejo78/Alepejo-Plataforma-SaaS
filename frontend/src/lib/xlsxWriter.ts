/**
 * Gera um .xlsx de verdade (Excel abre sem aviso nenhum) sem depender
 * de nenhuma biblioteca — as libs client-side pra isso (SheetJS/xlsx,
 * exceljs) têm CVE conhecida sem correção disponível ou trazem
 * dependências pesadas de Node (fs/stream) que não fazem sentido no
 * navegador. Um .xlsx é só um .zip com uns XMLs dentro — dá pra montar
 * na mão: escreve as partes sem compressão (STORE) e monta o zip.
 */

import type { TableExportData } from "./exportTable";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const textEncoder = new TextEncoder();

class ByteWriter {
  private chunks: Uint8Array[] = [];
  private size = 0;

  get length() {
    return this.size;
  }

  u16(value: number) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, value & 0xffff, true);
    this.bytes(b);
  }

  u32(value: number) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value >>> 0, true);
    this.bytes(b);
  }

  bytes(data: Uint8Array) {
    this.chunks.push(data);
    this.size += data.length;
  }

  text(str: string) {
    this.bytes(textEncoder.encode(str));
  }

  toUint8Array(): Uint8Array<ArrayBuffer> {
    // `new Uint8Array(n)` sempre aloca um ArrayBuffer normal (nunca
    // SharedArrayBuffer) — o cast só ajusta o tipo genérico pra bater
    // com o que `BlobPart` exige.
    const out = new Uint8Array(this.size) as Uint8Array<ArrayBuffer>;
    let offset = 0;

    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }

    return out;
  }
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Zip sem compressão (STORE) — mais simples de montar na mão, e um .xlsx pequeno não precisa compactar. */
function buildZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const fileWriter = new ByteWriter();
  const central: {
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    offset: number;
  }[] = [];

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = fileWriter.length;

    fileWriter.u32(0x04034b50);
    fileWriter.u16(20);
    fileWriter.u16(0);
    fileWriter.u16(0);
    fileWriter.u16(0);
    fileWriter.u16(0x21);
    fileWriter.u32(crc);
    fileWriter.u32(entry.data.length);
    fileWriter.u32(entry.data.length);
    fileWriter.u16(nameBytes.length);
    fileWriter.u16(0);
    fileWriter.bytes(nameBytes);
    fileWriter.bytes(entry.data);

    central.push({ nameBytes, crc, size: entry.data.length, offset });
  }

  const centralWriter = new ByteWriter();

  for (const c of central) {
    centralWriter.u32(0x02014b50);
    centralWriter.u16(20);
    centralWriter.u16(20);
    centralWriter.u16(0);
    centralWriter.u16(0);
    centralWriter.u16(0);
    centralWriter.u16(0x21);
    centralWriter.u32(c.crc);
    centralWriter.u32(c.size);
    centralWriter.u32(c.size);
    centralWriter.u16(c.nameBytes.length);
    centralWriter.u16(0);
    centralWriter.u16(0);
    centralWriter.u16(0);
    centralWriter.u16(0);
    centralWriter.u32(0);
    centralWriter.u32(c.offset);
    centralWriter.bytes(c.nameBytes);
  }

  const eocd = new ByteWriter();

  eocd.u32(0x06054b50);
  eocd.u16(0);
  eocd.u16(0);
  eocd.u16(central.length);
  eocd.u16(central.length);
  eocd.u32(centralWriter.length);
  eocd.u32(fileWriter.length);
  eocd.u16(0);

  const finalWriter = new ByteWriter();

  finalWriter.bytes(fileWriter.toUint8Array());
  finalWriter.bytes(centralWriter.toUint8Array());
  finalWriter.bytes(eocd.toUint8Array());

  return finalWriter.toUint8Array();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";

  while (n > 0) {
    const rem = (n - 1) % 26;

    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }

  return letters;
}

function buildSheetXml({ headers, rows }: TableExportData): string {
  const allRows = [headers, ...rows];

  const rowsXml = allRows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellsXml = row
        .map((cell, colIndex) => {
          const ref = `${columnLetter(colIndex)}${rowNumber}`;

          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

function buildWorkbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/** Monta o .xlsx (bytes prontos pra virar Blob) a partir dos dados da tabela. */
export function buildXlsx(data: TableExportData, sheetName: string): Uint8Array<ArrayBuffer> {
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: textEncoder.encode(CONTENT_TYPES_XML) },
    { name: "_rels/.rels", data: textEncoder.encode(ROOT_RELS_XML) },
    {
      name: "xl/workbook.xml",
      data: textEncoder.encode(buildWorkbookXml(sheetName)),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: textEncoder.encode(WORKBOOK_RELS_XML),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: textEncoder.encode(buildSheetXml(data)),
    },
  ];

  return buildZip(entries);
}
