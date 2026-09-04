import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { extname, join } from 'path';

import type { Company } from '@prisma/client';
import PDFDocument from 'pdfkit';

import { DATA_DIR } from '../../../core/storage/data-dir';
import type { EmailSummaryPaymentTerms } from '../../../core/utils/email-document-summary.util';

import { ServiceOrderRepository } from '../repositories/service-order.repository';
import { ServiceOrderService } from './service-order.service';

type ServiceOrderWithRelations = Awaited<
  ReturnType<ServiceOrderRepository['create']>
>;

const EMBEDDABLE_LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

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

function serviceOrderNumberOf(order: { number: number }): string {
  return `OS-${String(order.number).padStart(6, '0')}`;
}

/**
 * Gera o PDF da Ordem de Serviço — mesmo layout base do
 * `QuotePdfService`, com a diferença central de que os itens saem em
 * **duas tabelas separadas** (Serviços Realizados / Produtos e
 * Materiais Usados), nunca misturados numa lista só (ver
 * ServiceOrderService.buildSummaryHtml, mesmo critério no e-mail).
 * Anexado ao e-mail de confirmação e disponível pra download/
 * impressão pela tela.
 */
@Injectable()
export class ServiceOrderPdfService {
  private readonly logger = new Logger(ServiceOrderPdfService.name);

  constructor(private readonly serviceOrderService: ServiceOrderService) {}

  async generate(
    order: ServiceOrderWithRelations,
    company: Company | null,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.render(doc, order, company);

    doc.end();

    return done;
  }

  private render(
    doc: PDFKit.PDFDocument,
    order: ServiceOrderWithRelations,
    company: Company | null,
  ) {
    const companyName = company?.tradeName || company?.legalName || 'Empresa';
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    let cursorY = doc.page.margins.top;

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

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('ORDEM DE SERVIÇO', left, cursorY, {
        width: pageWidth,
        align: 'center',
      });

    cursorY = doc.y + 16;

    const orderNumber = serviceOrderNumberOf(order);
    const infoColWidth = pageWidth / 3;

    this.drawLabelValue(doc, 'Nº', orderNumber, left, cursorY, infoColWidth);
    this.drawLabelValue(
      doc,
      'Data',
      formatDateTimeAsLocalDate(order.createdAt),
      left + infoColWidth,
      cursorY,
      infoColWidth,
    );
    this.drawLabelValue(
      doc,
      'Conclusão',
      formatDateTimeAsLocalDate(order.completedAt),
      left + infoColWidth * 2,
      cursorY,
      infoColWidth,
    );

    cursorY += 40;

    const partner = order.partner;
    const partnerName = partner.tradeName || partner.legalName;
    const partnerPhone = partner.mobile || partner.phone || '-';

    this.drawLabelValue(
      doc,
      'Cliente',
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
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Descrição do serviço', left, cursorY, { width: pageWidth });

    doc
      .font('Helvetica')
      .fillColor('#374151')
      .text(order.description, left, doc.y + 2, { width: pageWidth });

    cursorY = doc.y + 16;

    cursorY = this.drawItemsTable(
      doc,
      'Serviços Realizados',
      order.serviceItems,
      left,
      cursorY,
      pageWidth,
    );

    cursorY += 12;

    cursorY = this.drawItemsTable(
      doc,
      'Peças Utilizadas',
      order.productItems,
      left,
      cursorY,
      pageWidth,
    );

    cursorY += 16;

    if (order.observation) {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('Observações', left, cursorY, { width: pageWidth * 0.6 });

      doc
        .font('Helvetica')
        .fillColor('#374151')
        .text(order.observation, left, doc.y + 2, { width: pageWidth * 0.6 });

      cursorY = doc.y + 16;
    }

    const paymentTerms = this.serviceOrderService.buildPaymentTerms(order);

    cursorY = this.drawPaymentTerms(doc, paymentTerms, left, cursorY, pageWidth);

    this.drawTotals(doc, order, left, cursorY, pageWidth);
  }

  private drawLogo(
    doc: PDFKit.PDFDocument,
    company: Company | null,
    x: number,
    y: number,
  ): number {
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
      doc.image(absolute, x, y, { fit: [70, 70] });

      return 84;
    } catch (err) {
      this.logger.warn(
        `Falha ao embutir logo no PDF da ordem de serviço: ${
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
    title: string,
    items: {
      quantity: unknown;
      unitPrice: unknown;
      totalPrice: unknown;
      product: { description: string };
    }[],
    left: number,
    startY: number,
    pageWidth: number,
  ): number {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(title, left, startY, { width: pageWidth });

    let y = doc.y + 4;

    if (items.length === 0) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text('Nenhum item.', left, y, { width: pageWidth });

      return doc.y;
    }

    const columns = [
      { title: 'Quant.', width: pageWidth * 0.12, align: 'right' as const },
      { title: 'Descrição', width: pageWidth * 0.5, align: 'left' as const },
      { title: 'Vl.Unit', width: pageWidth * 0.19, align: 'right' as const },
      { title: 'Vl.Total', width: pageWidth * 0.19, align: 'right' as const },
    ];

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

    for (const item of items) {
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

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0,
    );

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`Subtotal: ${formatMoney(subtotal)}`, left, y + 4, {
        width: pageWidth,
        align: 'right',
      });

    return doc.y;
  }

  /**
   * Forma de pagamento + parcelas — mesmo dado que já vai no e-mail
   * de confirmação (`ServiceOrderService.buildPaymentTerms`), agora
   * também no formulário impresso. Sem forma de pagamento definida
   * (não deveria acontecer, é campo obrigatório na criação), não
   * desenha nada.
   */
  private drawPaymentTerms(
    doc: PDFKit.PDFDocument,
    terms: EmailSummaryPaymentTerms | undefined,
    left: number,
    startY: number,
    pageWidth: number,
  ): number {
    if (!terms || terms.installments.length === 0) {
      return startY;
    }

    let y = startY;

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Forma de Pagamento', left, y, { width: pageWidth });

    y = doc.y + 4;

    if (terms.methodLabel) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#374151')
        .text(terms.methodLabel, left, y, { width: pageWidth });

      y = doc.y + 6;
    }

    if (terms.installments.length === 1) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#374151')
        .text(
          `Vencimento: ${terms.installments[0].dueDate}`,
          left,
          y,
          { width: pageWidth },
        );

      return doc.y + 16;
    }

    const columns = [
      { title: 'Parcela', width: pageWidth * 0.2, align: 'left' as const },
      {
        title: 'Vencimento',
        width: pageWidth * 0.4,
        align: 'left' as const,
      },
      { title: 'Valor', width: pageWidth * 0.4, align: 'right' as const },
    ];

    const rowHeight = 20;

    doc.rect(left, y, pageWidth, rowHeight).fill('#111827');

    let x = left;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');

    for (const col of columns) {
      doc.text(col.title, x + 6, y + 5, {
        width: col.width - 12,
        align: col.align,
      });

      x += col.width;
    }

    y += rowHeight;

    terms.installments.forEach((installment, index) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc
        .rect(left, y, pageWidth, rowHeight)
        .fillAndStroke('#f9fafb', '#e5e7eb');

      const values = [
        `${index + 1}/${terms.installments.length}`,
        installment.dueDate,
        formatMoney(installment.amount),
      ];

      let rowX = left;

      doc.fontSize(9).font('Helvetica').fillColor('#111827');

      values.forEach((text, colIndex) => {
        const col = columns[colIndex];

        doc.text(text, rowX + 6, y + 5, {
          width: col.width - 12,
          align: col.align,
        });

        rowX += col.width;
      });

      y += rowHeight;
    });

    return y + 16;
  }

  private drawTotals(
    doc: PDFKit.PDFDocument,
    order: ServiceOrderWithRelations,
    left: number,
    afterTableY: number,
    pageWidth: number,
  ) {
    const boxWidth = pageWidth * 0.4;
    const boxX = left + pageWidth - boxWidth;

    const rows: [string, string, boolean?][] = [
      ['Subtotal', formatMoney(order.totalAmount)],
    ];

    if (Number(order.discountValue) > 0) {
      rows.push(['Desconto', `- ${formatMoney(order.discountValue)}`]);
    }

    if (Number(order.freightValue) > 0) {
      rows.push(['Frete', formatMoney(order.freightValue)]);
    }

    if (Number(order.otherExpenses) > 0) {
      rows.push(['Outras despesas', formatMoney(order.otherExpenses)]);
    }

    rows.push(['Total', formatMoney(order.netAmount), true]);

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
