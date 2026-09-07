import { Injectable } from '@nestjs/common';

import * as crypto from 'crypto';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';

import { UpsertPaymentMethodSettingsDto } from '../dto/upsert-payment-method-settings.dto';

@Injectable()
export class PaymentMethodSettingsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getOrCreate(companyId: string) {
    const existing = await this.prisma.paymentMethodSettings.findUnique({
      where: { companyId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.paymentMethodSettings.create({
      data: { companyId },
    });
  }

  /**
   * Chave/segredo de webhook prontos pra tela mostrar — gera na
   * primeira vez que alguém abre a tela, nunca fica em branco depois
   * de existir a config.
   */
  async ensureWebhookToken(companyId: string): Promise<string> {
    const current = await this.getOrCreate(companyId);

    if (current.asaasWebhookToken) {
      return current.asaasWebhookToken;
    }

    const token = crypto.randomBytes(24).toString('hex');

    await this.prisma.paymentMethodSettings.update({
      where: { companyId },
      data: { asaasWebhookToken: token },
    });

    return token;
  }

  async regenerateWebhookToken(companyId: string): Promise<string> {
    await this.getOrCreate(companyId);

    const token = crypto.randomBytes(24).toString('hex');

    await this.prisma.paymentMethodSettings.update({
      where: { companyId },
      data: { asaasWebhookToken: token },
    });

    return token;
  }

  async upsert(companyId: string, dto: UpsertPaymentMethodSettingsDto) {
    const data = {
      ...(dto.asaasEnabled !== undefined && {
        asaasEnabled: dto.asaasEnabled,
      }),
      ...(dto.asaasApiKey && {
        asaasApiKeyEncrypted: this.encryption.encrypt(dto.asaasApiKey),
      }),
      ...(dto.asaasSandbox !== undefined && {
        asaasSandbox: dto.asaasSandbox,
      }),
      ...(dto.defaultBankAccountId !== undefined && {
        defaultBankAccountId: dto.defaultBankAccountId,
      }),
      ...(dto.boletoSurchargeType !== undefined && {
        boletoSurchargeType: dto.boletoSurchargeType,
      }),
      ...(dto.boletoSurchargeValue !== undefined && {
        boletoSurchargeValue: dto.boletoSurchargeValue,
      }),
      ...(dto.transferSurchargeType !== undefined && {
        transferSurchargeType: dto.transferSurchargeType,
      }),
      ...(dto.transferSurchargeValue !== undefined && {
        transferSurchargeValue: dto.transferSurchargeValue,
      }),
      ...(dto.pixSurchargeType !== undefined && {
        pixSurchargeType: dto.pixSurchargeType,
      }),
      ...(dto.pixSurchargeValue !== undefined && {
        pixSurchargeValue: dto.pixSurchargeValue,
      }),
      ...(dto.cardSurchargeType !== undefined && {
        cardSurchargeType: dto.cardSurchargeType,
      }),
      ...(dto.cardSurchargeValue !== undefined && {
        cardSurchargeValue: dto.cardSurchargeValue,
      }),
      ...(dto.cardMaxInstallments !== undefined && {
        cardMaxInstallments: dto.cardMaxInstallments,
      }),
      ...(dto.cardInterestFreeInstallments !== undefined && {
        cardInterestFreeInstallments: dto.cardInterestFreeInstallments,
      }),
      ...(dto.cardInterestRatePerInstallment !== undefined && {
        cardInterestRatePerInstallment: dto.cardInterestRatePerInstallment,
      }),
      ...(dto.pixKeyEnabled !== undefined && {
        pixKeyEnabled: dto.pixKeyEnabled,
      }),
      ...(dto.pixKeyType !== undefined && { pixKeyType: dto.pixKeyType }),
      ...(dto.pixKey !== undefined && { pixKey: dto.pixKey }),
      ...(dto.pixKeyOwnerName !== undefined && {
        pixKeyOwnerName: dto.pixKeyOwnerName,
      }),
      ...(dto.pixKeyCity !== undefined && { pixKeyCity: dto.pixKeyCity }),
    };

    return this.prisma.paymentMethodSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }

  /**
   * Credenciais decodificadas — só pra uso interno (nunca sai do
   * backend). Só devolve algo com `asaasEnabled` ligado — é o
   * interruptor que decide se o gateway é usado de verdade nas
   * cobranças, mesmo com chave já configurada.
   */
  async getDecryptedAsaasCredentials(
    companyId: string,
  ): Promise<{ apiKey: string; sandbox: boolean } | null> {
    const settings = await this.prisma.paymentMethodSettings.findUnique({
      where: { companyId },
    });

    if (!settings?.asaasEnabled || !settings.asaasApiKeyEncrypted) {
      return null;
    }

    return {
      apiKey: this.encryption.decrypt(settings.asaasApiKeyEncrypted),
      sandbox: settings.asaasSandbox,
    };
  }

  /**
   * Igual acima, mas ignora `asaasEnabled` — só pro botão "Testar
   * conexão" conseguir validar a chave já salva mesmo com o
   * interruptor desligado (a empresa pode querer testar antes de
   * ativar de vez).
   */
  async getDecryptedAsaasCredentialsForTest(
    companyId: string,
  ): Promise<{ apiKey: string; sandbox: boolean } | null> {
    const settings = await this.prisma.paymentMethodSettings.findUnique({
      where: { companyId },
    });

    if (!settings?.asaasApiKeyEncrypted) {
      return null;
    }

    return {
      apiKey: this.encryption.decrypt(settings.asaasApiKeyEncrypted),
      sandbox: settings.asaasSandbox,
    };
  }
}
