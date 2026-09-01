import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { extname, join } from 'path';

import type { Company, PayrollItemLine } from '@prisma/client';
import PDFDocument from 'pdfkit';

import { DATA_DIR } from '../../../core/storage/data-dir';

const EMBEDDABLE_LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export interface PayslipPdfEmployee {
  name: string;
  employeeNumber?: number | null;
  cpf?: string | null;
  admissionDate?: Date | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  jobFunction?: { name: string } | null;
}

export interface PayslipPdfItem {
  baseSalary: unknown;
  salaryType: string;
  dependentsCount: number;
  extraMinutes: number;
  unjustifiedAbsenceDays: number;
  inssBase: unknown;
  irrfBase: unknown;
  employerFgtsAmount: unknown;
  employee: PayslipPdfEmployee;
  lines: PayrollItemLine[];
  paymentDate?: Date | null;
  competenceYear: number;
  competenceMonth: number;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function competenceLabel(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Gera o PDF do holerite anexado no e-mail de confirmação de
 * recebimento (ver PayrollConfirmationService.dispatch) — mesmo
 * layout do `PayslipDocument.tsx` (frontend), reimplementado em
 * pdfkit porque o componente React não roda no servidor. Mesmo
 * padrão de `QuotePdfService` (orçamento).
 */
@Injectable()
export class PayslipPdfService {
  private readonly logger = new Logger(PayslipPdfService.name);

  async generate(item: PayslipPdfItem, company: Company | null): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.render(doc, item, company);

    doc.end();

    return done;
  }

  private render(doc: PDFKit.PDFDocument, item: PayslipPdfItem, company: Company | null) {
    const companyName = company?.tradeName || company?.legalName || 'Empresa';
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    let cursorY = doc.page.margins.top;

    // ---- Cabeçalho: logo + nome da empresa -------------------------------
    const logoWidth = this.drawLogo(doc, company, left, cursorY);

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(companyName, left + logoWidth, cursorY, { width: pageWidth * 0.6 - logoWidth });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#4b5563')
      .text('Matriz', left + logoWidth, doc.y + 2, { width: pageWidth * 0.6 - logoWidth });

    if (company?.document) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(company.document, left, cursorY, { width: pageWidth, align: 'right' });
    }

    cursorY = Math.max(doc.y, cursorY + (logoWidth > 0 ? 60 : 30)) + 10;

    doc.moveTo(left, cursorY).lineTo(left + pageWidth, cursorY).strokeColor('#d1d5db').lineWidth(1).stroke();

    cursorY += 12;

    // ---- Título -----------------------------------------------------------
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('DEMONSTRATIVO DE PAGAMENTO MENSAL', left, cursorY, {
        width: pageWidth,
        align: 'center',
        characterSpacing: 1,
      });

    cursorY = doc.y + 10;

    doc.moveTo(left, cursorY).lineTo(left + pageWidth, cursorY).strokeColor('#d1d5db').stroke();
    cursorY += 8;

    // ---- Período / data de pagamento --------------------------------------
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Período: ${competenceLabel(item.competenceYear, item.competenceMonth)}`, left, cursorY, {
        width: pageWidth * 0.5,
      });

    if (item.paymentDate) {
      doc.text(`Data Pagto: ${formatDate(item.paymentDate)}`, left + pageWidth * 0.5, cursorY, {
        width: pageWidth * 0.5,
        align: 'right',
      });
    }

    cursorY = doc.y + 10;

    doc.moveTo(left, cursorY).lineTo(left + pageWidth, cursorY).strokeColor('#d1d5db').stroke();
    cursorY += 8;

    // ---- Dados do colaborador ----------------------------------------------
    const employee = item.employee;

    this.drawRow(doc, left, cursorY, pageWidth, [
      `Matrícula: ${employee.employeeNumber ?? '—'} — Nome: ${employee.name}`,
      `CPF: ${employee.cpf ?? '—'}`,
    ]);
    cursorY = doc.y + 4;
    this.drawRow(doc, left, cursorY, pageWidth, [
      `Admissão: ${formatDate(employee.admissionDate)}`,
      `Cargo: ${employee.jobFunction?.name ?? '—'}`,
    ]);
    cursorY = doc.y + 10;

    doc.moveTo(left, cursorY).lineTo(left + pageWidth, cursorY).strokeColor('#d1d5db').stroke();
    cursorY += 8;

    const baseSalary = Number(item.baseSalary);
    const hourlyRate = item.salaryType === 'HORISTA' ? baseSalary : baseSalary / 220;

    this.drawRow(doc, left, cursorY, pageWidth, [
      `Salário Base: ${formatMoney(baseSalary)}`,
      `Salário Hora: ${formatMoney(hourlyRate)}`,
    ]);
    cursorY = doc.y + 4;
    this.drawRow(doc, left, cursorY, pageWidth, [
      `Banco/Agência: ${employee.bankName ?? '—'} / ${employee.bankAgency ?? '—'}`,
      `C/C: ${employee.bankAccount ?? '—'}`,
    ]);
    cursorY = doc.y + 10;

    // ---- Tabela de linhas ---------------------------------------------------
    cursorY = this.drawLinesTable(doc, item.lines, left, cursorY, pageWidth);

    // ---- Totais ---------------------------------------------------------------
    const totalProventos = item.lines
      .filter((l) => l.type === 'PROVENTO')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const totalDescontos = item.lines
      .filter((l) => l.type === 'DESCONTO')
      .reduce((sum, l) => sum + Number(l.amount), 0);
    const netAmount = totalProventos - totalDescontos;

    doc.rect(left, cursorY, pageWidth, 20).fillAndStroke('#f3f4f6', '#d1d5db');

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Total', left + 6, cursorY + 5, { width: pageWidth * 0.6 });

    doc.text(formatMoney(totalProventos), left + pageWidth * 0.6, cursorY + 5, {
      width: pageWidth * 0.2 - 6,
      align: 'right',
    });
    doc.text(formatMoney(totalDescontos), left + pageWidth * 0.8, cursorY + 5, {
      width: pageWidth * 0.2 - 6,
      align: 'right',
    });

    cursorY += 24;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Líquido', left, cursorY, { width: pageWidth * 0.7 });
    doc.text(formatMoney(netAmount), left + pageWidth * 0.7, cursorY, {
      width: pageWidth * 0.3,
      align: 'right',
    });

    cursorY = doc.y + 12;

    doc.moveTo(left, cursorY).lineTo(left + pageWidth, cursorY).strokeColor('#d1d5db').stroke();
    cursorY += 8;

    // ---- Rodapé (bases INSS/IRRF/FGTS/horas/faltas) --------------------------
    const footerFields: [string, string][] = [
      ['Base I.N.S.S.', formatMoney(item.inssBase)],
      ['F.G.T.S. do Mês', formatMoney(item.employerFgtsAmount)],
      ['Base I.R.R.F.', formatMoney(item.irrfBase)],
      ['Dep. I.R.R.F.', String(item.dependentsCount)],
      ['Horas Extras no Mês', (item.extraMinutes / 60).toFixed(2)],
      ['Faltas Injustificadas', `${item.unjustifiedAbsenceDays} dia(s)`],
    ];

    doc.fontSize(8).font('Helvetica').fillColor('#374151');

    footerFields.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = left + col * (pageWidth / 2);
      const y = cursorY + row * 14;

      doc.text(`${label}: ${value}`, x, y, { width: pageWidth / 2 - 6 });
    });

    cursorY += Math.ceil(footerFields.length / 2) * 14 + 30;

    // ---- Assinatura -------------------------------------------------------------
    const signatureWidth = pageWidth * 0.5;
    const signatureX = left + (pageWidth - signatureWidth) / 2;

    doc.moveTo(signatureX, cursorY).lineTo(signatureX + signatureWidth, cursorY).strokeColor('#9ca3af').stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Assinatura do colaborador', signatureX, cursorY + 4, {
        width: signatureWidth,
        align: 'center',
      });
  }

  private drawRow(doc: PDFKit.PDFDocument, left: number, y: number, pageWidth: number, values: string[]) {
    doc.fontSize(8).font('Helvetica').fillColor('#374151');

    const colWidth = pageWidth / values.length;

    values.forEach((value, index) => {
      doc.text(value, left + index * colWidth, y, { width: colWidth - 6 });
    });
  }

  private drawLinesTable(
    doc: PDFKit.PDFDocument,
    lines: PayrollItemLine[],
    left: number,
    startY: number,
    pageWidth: number,
  ): number {
    const columns = [
      { title: 'Cód.', width: pageWidth * 0.22, align: 'left' as const },
      { title: 'Descrição', width: pageWidth * 0.28, align: 'left' as const },
      { title: 'Unidade', width: pageWidth * 0.16, align: 'right' as const },
      { title: 'Proventos', width: pageWidth * 0.17, align: 'right' as const },
      { title: 'Descontos', width: pageWidth * 0.17, align: 'right' as const },
    ];

    let y = startY;
    const rowHeight = 18;

    const drawHeader = () => {
      doc.rect(left, y, pageWidth, rowHeight).fill('#111827');

      let x = left;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');

      for (const col of columns) {
        doc.text(col.title, x + 4, y + 5, { width: col.width - 8, align: col.align });
        x += col.width;
      }

      y += rowHeight;
    };

    drawHeader();

    for (const line of lines) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 140) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }

      doc.rect(left, y, pageWidth, rowHeight).fillAndStroke('#f9fafb', '#e5e7eb');

      const values = [
        line.code,
        line.description,
        line.referenceValue ?? '',
        line.type === 'PROVENTO' ? formatMoney(line.amount) : '',
        line.type === 'DESCONTO' ? formatMoney(line.amount) : '',
      ];

      doc.fontSize(8).font('Helvetica').fillColor('#111827');

      let x = left;

      values.forEach((text, index) => {
        const col = columns[index];

        doc.text(text, x + 4, y + 5, { width: col.width - 8, align: col.align });
        x += col.width;
      });

      y += rowHeight;
    }

    return y + 8;
  }

  /** Devolve a largura ocupada pela logo (0 se não houver logo embutível) — mesma lógica de QuotePdfService. */
  private drawLogo(doc: PDFKit.PDFDocument, company: Company | null, x: number, y: number): number {
    if (!company?.brandingLogoLightEnabled || !company.logo) {
      return 0;
    }

    const relative = company.logo.replace(/^\/?uploads\//, '');
    const absolute = join(DATA_DIR, 'uploads', relative);

    if (!EMBEDDABLE_LOGO_EXTENSIONS.has(extname(absolute).toLowerCase())) {
      return 0;
    }

    if (!existsSync(absolute)) {
      return 0;
    }

    try {
      doc.image(absolute, x, y, { fit: [50, 50] });

      return 60;
    } catch (err) {
      this.logger.warn(
        `Falha ao embutir logo no PDF do holerite: ${err instanceof Error ? err.message : String(err)}`,
      );

      return 0;
    }
  }
}
