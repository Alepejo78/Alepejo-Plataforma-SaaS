/**
 * Cabeçalho/rodapé configuráveis, desenhados em cima do layout normal
 * de cada PDF (orçamento, holerite, ordem de serviço) — não mexe no
 * `render()` de cada um, só empilha um bloco de texto antes (cabeçalho,
 * empurra o resto pra baixo) e depois (rodapé, ancorado no fim da
 * última página) do conteúdo de sempre. `null`/vazio não desenha nada.
 */

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
