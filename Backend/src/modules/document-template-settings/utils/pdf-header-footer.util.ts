/**
 * Cabeçalho/rodapé configuráveis, desenhados em cima do layout normal
 * de cada PDF (orçamento, holerite, ordem de serviço) — não mexe no
 * `render()` de cada um, só empilha um bloco de texto antes (cabeçalho,
 * empurra o resto pra baixo) e depois (rodapé, ancorado no fim da
 * última página) do conteúdo de sempre. `null`/vazio não desenha nada.
 */

import { existsSync } from 'fs';
import { extname, join } from 'path';

import { DATA_DIR } from '../../../core/storage/data-dir';

/** PDFKit só embute PNG/JPEG direto — mesmo limite de `templateImageFileFilter`, que já barra outros formatos no upload. */
const EMBEDDABLE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

/**
 * Template completo (imagem com cabeçalho + rodapé já desenhados,
 * tipo letterhead exportado do Canva) — desenhado como fundo da
 * página inteira, ANTES de qualquer outro conteúdo (por isso é
 * chamado logo no início de `generate()`, antes de `render()`).
 * Registra `pageAdded` pra repetir o fundo em documentos de mais de
 * uma página (holerite/orçamento grande) — sem isso só a primeira
 * página teria a arte.
 */
export function drawPdfTemplateBackground(
  doc: PDFKit.PDFDocument,
  imagePath: string | null | undefined,
): void {
  if (!imagePath) {
    return;
  }

  const relative = imagePath.replace(/^\/?uploads\//, '');
  const absolute = join(DATA_DIR, 'uploads', relative);

  if (
    !EMBEDDABLE_IMAGE_EXTENSIONS.has(extname(absolute).toLowerCase()) ||
    !existsSync(absolute)
  ) {
    return;
  }

  const draw = () => {
    try {
      doc.save();
      doc.image(absolute, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
      doc.restore();
    } catch {
      // Falha ao desenhar o template não pode derrubar a geração do
      // PDF inteiro — segue sem a arte de fundo.
    }
  };

  draw();
  doc.on('pageAdded', draw);
}

interface PdfTemplateSettingsLike {
  pdfHeader?: string | null;
  pdfFooter?: string | null;
  templateImagePath?: string | null;
}

/**
 * Margem de cima/baixo da página — abre espaço pro texto de cabeçalho/
 * rodapé (linha única, pequena) ou pra arte do template completo
 * (banda maior, calculada pela proporção da imagem de referência do
 * usuário: ~15% de cima, ~10% de baixo numa A4). Usado na hora de
 * criar o `PDFDocument`, antes de `render()` desenhar o resto —
 * mesmos números nos 4 pontos de geração (orçamento, holerite,
 * relatório de ponto, ordem de serviço).
 */
export function computePdfMargins(settings: PdfTemplateSettingsLike | null) {
  const hasTemplateImage = Boolean(settings?.templateImagePath);

  return {
    top: hasTemplateImage ? 110 : settings?.pdfHeader ? 64 : 40,
    bottom: hasTemplateImage ? 90 : settings?.pdfFooter ? 56 : 40,
    left: 40,
    right: 40,
  };
}

/** Desenha o cabeçalho, se configurado, e devolve o Y logo abaixo dele — quem chama usa esse Y como ponto de partida do resto do layout. */
export function drawPdfHeader(
  doc: PDFKit.PDFDocument,
  header: string | null | undefined,
): number {
  const left = doc.page.margins.left;
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let cursorY = doc.page.margins.top;

  if (header?.trim()) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(header.trim(), left, cursorY, {
        width: pageWidth,
        align: 'center',
      });

    cursorY = doc.y + 10;
  }

  return cursorY;
}

/** Desenha o rodapé, se configurado, ancorado no fim da página atual (a última desenhada). */
export function drawPdfFooter(
  doc: PDFKit.PDFDocument,
  footer: string | null | undefined,
): void {
  if (!footer?.trim()) {
    return;
  }

  const left = doc.page.margins.left;
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - doc.page.margins.bottom - 16;

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(footer.trim(), left, y, {
      width: pageWidth,
      align: 'center',
    });
}
