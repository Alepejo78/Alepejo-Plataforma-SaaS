import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface AsaasCredentials {
  apiKey: string;
  /** Sandbox por padrão — só produção quando explicitamente marcado. */
  sandbox?: boolean;
}

export interface AsaasCustomer {
  id: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate?: string | null;
  billingType: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  /** Número da fatura que o Asaas gera pra cobrança (ex.: "00000123"). */
  invoiceNumber?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: string;
}

interface AsaasListResponse<T> {
  data: T[];
}

/**
 * Cliente HTTP isolado do Asaas — se um dia trocar de gateway, a
 * mudança fica contida aqui, sem espalhar pelo resto do sistema.
 * Usa o `fetch` nativo do Node (18+), sem dependência nova.
 *
 * Cada método aceita `credentials` opcional (apiKey própria de uma
 * empresa cliente, ver módulo `payment-method-settings`/`entry-charges`)
 * — quando omitido, cai nas variáveis globais do `.env`
 * (`ASAAS_API_KEY`/`ASAAS_API_URL`), que são as credenciais da
 * própria AlePejo usadas pelo módulo `billing` (cobrança da
 * assinatura do ERP). Sandbox por padrão nas globais também.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  private resolveBaseUrl(credentials?: AsaasCredentials): string {
    if (credentials) {
      return credentials.sandbox === false
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3';
    }

    return process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';
  }

  private resolveApiKey(credentials?: AsaasCredentials): string | undefined {
    return credentials?.apiKey ?? process.env.ASAAS_API_KEY;
  }

  private headers(credentials?: AsaasCredentials): Record<string, string> {
    const apiKey = this.resolveApiKey(credentials);

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Integração de cobrança não configurada (chave da API do Asaas ausente).',
      );
    }

    return {
      'Content-Type': 'application/json',
      access_token: apiKey,
    };
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
    credentials?: AsaasCredentials,
  ): Promise<T> {
    const response = await fetch(`${this.resolveBaseUrl(credentials)}${path}`, {
      ...init,
      headers: { ...this.headers(credentials), ...(init?.headers ?? {}) },
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        body?.errors?.[0]?.description ??
        `Asaas respondeu ${response.status}`;

      this.logger.error(`${init?.method ?? 'GET'} ${path} → ${message}`);

      throw new BadGatewayException(
        `Não foi possível concluir a operação com o gateway de pagamento: ${message}`,
      );
    }

    return body as T;
  }

  async findCustomerByExternalReference(
    externalReference: string,
    credentials?: AsaasCredentials,
  ): Promise<AsaasCustomer | null> {
    const result = await this.request<AsaasListResponse<AsaasCustomer>>(
      `/customers?externalReference=${encodeURIComponent(externalReference)}`,
      undefined,
      credentials,
    );

    return result.data?.[0] ?? null;
  }

  async createCustomer(
    params: {
      externalReference: string;
      name: string;
      email: string;
      cpfCnpj: string;
      phone?: string;
    },
    credentials?: AsaasCredentials,
  ): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>(
      '/customers',
      {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          cpfCnpj: params.cpfCnpj,
          phone: params.phone,
          externalReference: params.externalReference,
        }),
      },
      credentials,
    );
  }

  async createSubscription(
    params: {
      customer: string;
      billingType: string;
      value: number;
      nextDueDate: string;
      cycle: 'MONTHLY' | 'YEARLY';
      externalReference: string;
      description: string;
    },
    credentials?: AsaasCredentials,
  ): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(
      '/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      credentials,
    );
  }

  /**
   * Encerra a assinatura. As cobranças já emitidas continuam de pé —
   * o Asaas só para de gerar as próximas, que é o que se quer ao
   * trocar de ciclo.
   */
  async deleteSubscription(
    subscriptionId: string,
    credentials?: AsaasCredentials,
  ): Promise<void> {
    await this.request(
      `/subscriptions/${subscriptionId}`,
      { method: 'DELETE' },
      credentials,
    );
  }

  async createPayment(
    params: {
      customer: string;
      billingType: string;
      value: number;
      dueDate: string;
      description: string;
      externalReference?: string;
    },
    credentials?: AsaasCredentials,
  ): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      credentials,
    );
  }

  async getPayment(
    paymentId: string,
    credentials?: AsaasCredentials,
  ): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(
      `/payments/${paymentId}`,
      undefined,
      credentials,
    );
  }

  async listSubscriptionPayments(
    subscriptionId: string,
    credentials?: AsaasCredentials,
  ): Promise<AsaasPayment[]> {
    const result = await this.request<AsaasListResponse<AsaasPayment>>(
      `/subscriptions/${subscriptionId}/payments`,
      undefined,
      credentials,
    );

    return result.data ?? [];
  }

  async getPixQrCode(
    paymentId: string,
    credentials?: AsaasCredentials,
  ): Promise<{ payload: string; encodedImage: string } | null> {
    try {
      return await this.request<{
        payload: string;
        encodedImage: string;
      }>(`/payments/${paymentId}/pixQrCode`, undefined, credentials);
    } catch {
      // Nem toda cobrança tem PIX disponível de imediato — não é erro fatal.
      return null;
    }
  }
}
