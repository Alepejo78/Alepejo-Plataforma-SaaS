import { Injectable } from '@nestjs/common';

import { AsaasService } from '../../billing/services/asaas.service';

import { PaymentMethodSettingsRepository } from '../repositories/payment-method-settings.repository';

import { UpsertPaymentMethodSettingsDto } from '../dto/upsert-payment-method-settings.dto';
import { TestAsaasConnectionDto } from '../dto/test-asaas-connection.dto';

@Injectable()
export class PaymentMethodSettingsService {
  constructor(
    private readonly repository: PaymentMethodSettingsRepository,
    private readonly asaas: AsaasService,
  ) {}

  async getSettings(companyId: string) {
    const settings = await this.repository.getOrCreate(companyId);
    const webhookToken = await this.repository.ensureWebhookToken(companyId);

    const { asaasApiKeyEncrypted, ...rest } = settings;

    return {
      ...rest,
      asaasWebhookToken: webhookToken,
      hasAsaasApiKey: Boolean(asaasApiKeyEncrypted),
    };
  }

  async updateSettings(
    companyId: string,
    dto: UpsertPaymentMethodSettingsDto,
  ) {
    await this.repository.upsert(companyId, dto);

    return this.getSettings(companyId);
  }

  async regenerateWebhookToken(companyId: string) {
    const token = await this.repository.regenerateWebhookToken(companyId);

    return { asaasWebhookToken: token };
  }

  async testAsaasConnection(companyId: string, dto: TestAsaasConnectionDto) {
    const credentials = dto.apiKey
      ? { apiKey: dto.apiKey, sandbox: dto.sandbox ?? true }
      : await this.repository.getDecryptedAsaasCredentialsForTest(
          companyId,
        );

    if (!credentials) {
      return { ok: false, message: 'Nenhuma chave do Asaas configurada.' };
    }

    try {
      await this.asaas.findCustomerByExternalReference(
        '__connection_test__',
        credentials,
      );

      return { ok: true, message: 'Conexão com o Asaas confirmada.' };
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível conectar ao Asaas.',
      };
    }
  }
}
