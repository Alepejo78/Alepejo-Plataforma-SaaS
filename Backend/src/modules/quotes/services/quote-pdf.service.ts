import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { extname, join } from 'path';

import type { Company } from '@prisma/client';
import PDFDocument from 'pdfkit';

import { DATA_DIR } from '../../../core/storage/data-dir';

import { QuoteRepository } from '../repositories/quote.repository';

type QuoteWithRelations = Awaited<ReturnType<QuoteRepository['create']>>;

/** Extensões que o PDFKit consegue embutir direto — PNG e JPEG só. */
const EMBEDDABLE_LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

/**
 * `quoteDate`/`validUntil`: data pura (sem hora), nascida de um
 * `<input type="date">` — formata em UTC, senão meia-noite UTC vira
 * 21h do dia anterior no fuso de Brasília. Mesmo padrão do resto do
 * app (ver `frontend/src/app/erp/vendas/orcamentos/page.tsx`).
 */
function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
  });
}

/** `createdAt`: timestamp de verdade — este sim no fuso de Brasília. */
function formatDateTimeAsLocalDate(
  value: Date | string | null | undefined,
): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value ?? 0));
}

function quoteNumberOf(quote: { number: number }): string {
  return `ORC-${String(quote.number).padStart(6, '0')}`;
}

/**
 * Gera o PDF do orçamento anexado no e-mail ao cliente
 * (ver QuoteService.notifyPartner). Layout inspirado no modelo que o
 * usuário mandou como referência (cabeçalho com logo, nº/data/
 * validade, dados do cliente, tabela de itens, totais).
 */
@Injectable()
export class QuotePdfService {
  private readonly logger = new Logger(QuotePdfService.name);

  async generate(
    quote: QuoteWithRelations,
    company: Company | null,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.render(doc, quote, company);

    doc.end();

    return done;
  }

  private render(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    company: Company | null,
  ) {
    const companyName = company?.tradeName || company?.legalName || 'Empresa';
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    let cursorY = doc.page.margins.top;

    // ---- Cabeçalho: logo + nome da empresa ----------------------------
    const logoWidth = this.drawLogo(doc, company, left, cursorY);

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(companyName, left + logoWidth, cursorY + (logoWidth > 0 ? 14 : 0), {
        width: pageWidth - logoWidth,
      });

    if (company?.phone || company?.email) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(
          [company?.phone, company?.email].filter(Boolean).join('  ·  '),
          left + logoWidth,
          doc.y + 2,
          { width: pageWidth - logoWidth },
        );
    }

    cursorY = Math.max(doc.y, cursorY + 60) + 16;

    doc
      .moveTo(left, cursorY)
      .lineTo(left + pageWidth, cursorY)
      .strokeColor('#d1d5db')
      .lineWidth(1)
      .stroke();

    cursorY += 18;

    // ---- Título ---------------------------------------------------------
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('ORÇAMENTO', left, cursorY, {
        width: pageWidth,
        align: 'center',
      });

    cursorY = doc.y + 16;

    // ---- Nº / Data / Validade -------------------------------------------
    const quoteNumber = quoteNumberOf(quote);
    const infoColWidth = pageWidth / 3;

    this.drawLabelValue(doc, 'Nº', quoteNumber, left, cursorY, infoColWidth);
    this.drawLabelValue(
      doc,
      'Data',
      quote.quoteDate
        ? formatDate(quote.quoteDate)
        : formatDateTimeAsLocalDate(quote.createdAt),
      left + infoColWidth,
      cursorY,
      infoColWidth,
    );
    this.drawLabelValue(
      doc,
      'Data Validade',
      formatDate(quote.validUntil),
      left + infoColWidth * 2,
      cursorY,
      infoColWidth,
    );

    cursorY += 40;

    // ---- Cliente ----------------------------------------------------------
    const partner = quote.partner;
    const partnerName = partner.tradeName || partner.legalName;
    const partnerPhone = partner.mobile || partner.phone || '-';

    this.drawLabelValue(
      doc,
      'Nome',
      partnerName,
      left,
      cursorY,
      pageWidth * 0.65,
    );
    this.drawLabelValue(
      doc,
      'Telefone',
      partnerPhone,
      left + pageWidth * 0.65,
      cursorY,
      pageWidth * 0.35,
    );

    cursorY += 40;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text('Segue orçamento conforme descrição abaixo:', left, cursorY);

    cursorY = doc.y + 12;

    // ---- Tabela de itens ----------------------------------------------
    cursorY = this.drawItemsTable(doc, quote, left, cursorY, pageWidth);

    cursorY += 16;

    // ---- Observações (quando preenchidas) -------------------------------
    if (quote.observation) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Observações', left, cursorY, {
          width: pageWidth * 0.6,
        });

      doc
        .font('Helvetica')
        .fillColor('#374151')
        .text(quote.observation, left, doc.y + 2, {
          width: pageWidth * 0.6,
        });
    }

    // ---- Totais ------------------------------------------------------------
    this.drawTotals(doc, quote, left, cursorY, pageWidth);
  }

  /** Devolve a largura ocupada pela logo (0 se não houver logo embutível). */
  private drawLogo(
    doc: PDFKit.PDFDocument,
    company: Company | null,
    x: number,
    y: number,
  ): number {
    if (!company?.brandingLogoLightEnabled || !company.logo) {
      return 0;
    }

    // `company.logo` é o caminho público (/uploads/branding/...) —
    // resolve pro arquivo em disco, na mesma raiz usada no upload
    // (ver core/storage/data-dir.ts).
    const relative = company.logo.replace(/^\/?uploads\//, '');
    const absolute = join(DATA_DIR, 'uploads', relative);

    if (!EMBEDDABLE_LOGO_EXTENSIONS.has(extname(absolute).toLowerCase())) {
      // SVG/WEBP: PDFKit não embute esses formatos direto — sem
      // conversão de imagem no servidor, cai pro nome da empresa só
      // em texto (ainda assim usa a marca certa, só sem a logo).
      return 0;
    }

    if (!existsSync(absolute)) {
      return 0;
    }

    try {
      doc.image(absolute, x, y, { fit: [70, 70] });

      return 84;
    } catch (err) {
      this.logger.warn(
        `Falha ao embutir logo no PDF do orçamento: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      return 0;
    }
  }

  private drawLabelValue(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    x: number,
    y: number,
    width: number,
  ) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(label.toUpperCase(), x, y, { width });

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(value, x, doc.y + 1, { width });
  }

  private drawItemsTable(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    left: number,
    startY: number,
    pageWidth: number,
  ): number {
    const columns = [
      { title: 'Quant.', width: pageWidth * 0.12, align: 'right' as const },
      { title: 'Descrição', width: pageWidth * 0.5, align: 'left' as const },
      { title: 'Vl.Unit', width: pageWidth * 0.19, align: 'right' as const },
      { title: 'Vl.Total', width: pageWidth * 0.19, align: 'right' as const },
    ];

    let y = startY;
    const rowHeight = 22;

    const drawHeader = () => {
      doc.rect(left, y, pageWidth, rowHeight).fill('#111827');

      let x = left;

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');

      for (const col of columns) {
        doc.text(col.title, x + 6, y + 6, {
          width: col.width - 12,
          align: col.align,
        });

        x += col.width;
      }

      y += rowHeight;
    };

    drawHeader();

    for (const item of quote.items) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }

      doc
        .rect(left, y, pageWidth, rowHeight)
        .fillAndStroke('#f9fafb', '#e5e7eb');

      let x = left;

      const values = [
        Number(item.quantity).toLocaleString('pt-BR'),
        item.product.description,
        formatMoney(item.unitPrice),
        formatMoney(item.totalPrice),
      ];

      doc.fontSize(9).font('Helvetica').fillColor('#111827');

      values.forEach((text, index) => {
        const col = columns[index];

        doc.text(text, x + 6, y + 6, {
          width: col.width - 12,
          align: col.align,
        });

        x += col.width;
      });

      y += rowHeight;
    }

    return y;
  }

  private drawTotals(
    doc: PDFKit.PDFDocument,
    quote: QuoteWithRelations,
    left: number,
    afterTableY: number,
    pageWidth: number,
  ) {
    const boxWidth = pageWidth * 0.4;
    const boxX = left + pageWidth - boxWidth;

    const rows: [string, string, boolean?][] = [
      ['Subtotal', formatMoney(quote.totalAmount)],
    ];

    if (Number(quote.discountValue) > 0) {
      rows.push(['Desconto', `- ${formatMoney(quote.discountValue)}`]);
    }

    if (Number(quote.freightValue) > 0) {
      rows.push(['Frete', formatMoney(quote.freightValue)]);
    }

    if (Number(quote.otherExpenses) > 0) {
      rows.push(['Outras despesas', formatMoney(quote.otherExpenses)]);
    }

    rows.push(['Total', formatMoney(quote.netAmount), true]);

    let y = Math.max(afterTableY, doc.y) + 6;

    for (const [label, value, highlighted] of rows) {
      doc
        .fontSize(highlighted ? 11 : 9)
        .font(highlighted ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(highlighted ? '#111827' : '#4b5563')
        .text(label, boxX, y, { width: boxWidth * 0.5 });

      doc
        .fontSize(highlighted ? 11 : 9)
        .font(highlighted ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(highlighted ? '#111827' : '#4b5563')
        .text(value, boxX + boxWidth * 0.5, y, {
          width: boxWidth * 0.5,
          align: 'right',
        });

      y += highlighted ? 20 : 16;
    }
  }
}
