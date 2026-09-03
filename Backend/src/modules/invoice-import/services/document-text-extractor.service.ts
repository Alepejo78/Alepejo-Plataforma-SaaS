import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';

const MIN_USABLE_PDF_TEXT_LENGTH = 30;

/**
 * Extrai o texto cru de um PDF ou imagem, pra depois passar por
 * `DocumentFieldExtractorService` — separado do XML de propósito
 * (ver `InvoiceXmlParserService`), que já tem seu próprio pipeline
 * estruturado.
 *
 * PDF "nascido digital" (boleto/fatura baixado do banco/concessionária)
 * já tem o texto embutido — `pdf-parse` lê isso sem OCR nenhum, rápido
 * e sem erro de leitura. PDF escaneado (foto colada, sem camada de
 * texto) não tem o que extrair — rejeitado com uma mensagem clara
 * pedindo pra mandar como foto em vez de PDF (rasterizar PDF em
 * imagem no servidor puxaria uma dependência nativa arriscada de
 * implantar no Railway; fica pra uma entrega futura se precisar).
 *
 * Imagem (foto de cupom fiscal, conta impressa) sempre precisa de OCR
 * — usa Tesseract.js (gratuito, local, sem chave de API), em
 * português. Precisão bem mais fraca que texto embutido — por isso o
 * resultado sempre passa por revisão manual antes de confirmar
 * qualquer lançamento.
 */
@Injectable()
export class DocumentTextExtractorService {
  private readonly logger = new Logger(DocumentTextExtractorService.name);

  async extractRawText(
    buffer: Buffer,
    mimetype: string | undefined,
    filename: string | undefined,
  ): Promise<string> {
    const isPdf =
      mimetype === 'application/pdf' ||
      (filename?.toLowerCase().endsWith('.pdf') ?? false);

    if (isPdf) {
      return this.extractFromPdf(buffer);
    }

    const isImage =
      (mimetype?.startsWith('image/') ?? false) ||
      /\.(jpe?g|png|webp|bmp)$/i.test(filename ?? '');

    if (isImage) {
      return this.extractFromImage(buffer);
    }

    throw new BadRequestException(
      'Formato não suportado — envie XML, PDF ou uma foto (JPG/PNG).',
    );
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const text = result.text?.trim() ?? '';

      if (text.length < MIN_USABLE_PDF_TEXT_LENGTH) {
        throw new BadRequestException(
          'Este PDF parece ser uma imagem escaneada, sem texto — envie como foto (JPG/PNG) em vez de PDF.',
        );
      }

      return text;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      this.logger.warn(
        `Falha ao ler PDF: ${err instanceof Error ? err.message : String(err)}`,
      );

      throw new BadRequestException(
        'Não foi possível ler este PDF — confira se o arquivo não está corrompido.',
      );
    } finally {
      await parser.destroy();
    }
  }

  private async extractFromImage(buffer: Buffer): Promise<string> {
    const worker = await createWorker('por');

    try {
      const {
        data: { text },
      } = await worker.recognize(buffer);

      return text?.trim() ?? '';
    } catch (err) {
      this.logger.warn(
        `Falha na leitura OCR: ${err instanceof Error ? err.message : String(err)}`,
      );

      throw new BadRequestException(
        'Não foi possível ler esta imagem — tente uma foto mais nítida.',
      );
    } finally {
      await worker.terminate();
    }
  }
}
