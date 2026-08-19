import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

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
 * Sandbox por padrão (`ASAAS_API_URL` não definido) — só aponta para
 * produção quando a variável for setada explicitamente.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  private get baseUrl(): string {
    return process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';
  }

  private get apiKey(): string | undefined {
    return process.env.ASAAS_API_KEY;
  }

  private headers(): Record<string, string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Integração de cobrança não configurada (ASAAS_API_KEY ausente no servidor).',
      );
    }

    return {
      'Content-Type': 'application/json',
      access_token: this.apiKey,
    };
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers ?? {}) },
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
  ): Promise<AsaasCustomer | null> {
    const result = await this.request<AsaasListResponse<AsaasCustomer>>(
      `/customers?externalReference=${encodeURIComponent(externalReference)}`,
    );

    return result.data?.[0] ?? null;
  }

  async createCustomer(params: {
    externalReference: string;
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  }): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        email: params.email,
        cpfCnpj: params.cpfCnpj,
        phone: params.phone,
        externalReference: params.externalReference,
      }),
    });
  }

  async createSubscription(params: {
    customer: string;
    billingType: string;
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    externalReference: string;
    description: string;
  }): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createPayment(params: {
    customer: string;
    billingType: string;
    value: number;
    dueDate: string;
    description: string;
    externalReference?: string;
  }): Promise<AsaasPayment> {
    return this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${paymentId}`);
  }

  async listSubscriptionPayments(
    subscriptionId: string,
  ): Promise<AsaasPayment[]> {
    const result = await this.request<AsaasListResponse<AsaasPayment>>(
      `/subscriptions/${subscriptionId}/payments`,
    );

    return result.data ?? [];
  }

  async getPixQrCode(
    paymentId: string,
  ): Promise<{ payload: string; encodedImage: string } | null> {
    try {
      return await this.request<{
        payload: string;
        encodedImage: string;
      }>(`/payments/${paymentId}/pixQrCode`);
    } catch {
      // Nem toda cobrança tem PIX disponível de imediato — não é erro fatal.
      return null;
    }
  }
}
