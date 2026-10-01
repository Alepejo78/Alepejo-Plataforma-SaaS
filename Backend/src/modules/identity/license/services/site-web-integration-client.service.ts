import { Injectable, Logger } from '@nestjs/common';

export interface WebsiteLicenseSetup {
  amount: number;
  paid: boolean;
  dueDate: string | null;
  paymentUrl: string | null;
  invoiceNumber: string | null;
}

export interface WebsiteLicenseMonthly {
  amount: number;
  dueDate: string;
  paymentUrl: string | null;
  invoiceNumber: string | null;
  overdue: boolean;
}

export type WebsiteLicenseLookup =
  | { found: false }
  | {
      found: true;
      planName: string | null;
      siteName: string | null;
      status: string;
      siteBlocked: boolean;
      setup: WebsiteLicenseSetup | null;
      monthly: WebsiteLicenseMonthly | null;
    };

/**
 * Cliente HTTP isolado da integração com o AlePejoServiços (produto
 * Site WEB) — usado só pela aba "Website" de Configurações >
 * Licenciamento. Se a chamada falhar (serviço fora do ar, não
 * configurado), devolve "não encontrado" em vez de quebrar a tela de
 * Licenciamento do ERP, que depende de outras informações além desta.
 */
@Injectable()
export class SiteWebIntegrationClientService {
  private readonly logger = new Logger(SiteWebIntegrationClientService.name);

  async lookup(document: string, email: string): Promise<WebsiteLicenseLookup> {
    const baseUrl = process.env.SERVICOS_INTEGRATION_URL;
    const key = process.env.SERVICOS_INTEGRATION_KEY;

    if (!baseUrl || !key) {
      return { found: false };
    }

    try {
      // O backend do AlePejoServiços serve tudo sob o prefixo global "/api".
      const url = new URL('/api/integrations/site-web/lookup', baseUrl);
      url.searchParams.set('document', document);
      url.searchParams.set('email', email);

      const response = await fetch(url, {
        headers: { 'x-integration-key': key },
      });

      if (!response.ok) {
        this.logger.warn(
          `Consulta ao Site WEB (AlePejoServiços) retornou ${response.status}.`,
        );
        return { found: false };
      }

      // O AlePejoServiços embrulha toda resposta num envelope
      // {success, timestamp, data} (mesmo interceptor global usado
      // neste ERP) — o dado de verdade está em `.data`, não na raiz.
      const body = (await response.json()) as { data: WebsiteLicenseLookup };
      return body.data;
    } catch (err) {
      this.logger.warn(
        `Falha ao consultar o plano Website: ${err instanceof Error ? err.message : err}`,
      );
      return { found: false };
    }
  }
}
