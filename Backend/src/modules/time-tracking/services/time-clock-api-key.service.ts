import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { PasswordService } from '../../../core/security/password.service';

const PREFIX_LENGTH = 10;

/**
 * Chave de API por empresa, pra dispositivo externo (relógio de
 * ponto, leitor de QR/código de barras) bater ponto sem login. Só o
 * hash (bcrypt) fica gravado — o valor puro só existe na hora de
 * gerar, nunca mais depois (mesmo padrão de senha de usuário, ver
 * PasswordService).
 */
@Injectable()
export class TimeClockApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async getStatus(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        timeClockApiKeyPrefix: true,
        timeClockApiKeyCreatedAt: true,
      },
    });

    return {
      active: Boolean(company?.timeClockApiKeyPrefix),
      prefix: company?.timeClockApiKeyPrefix ?? null,
      createdAt: company?.timeClockApiKeyCreatedAt ?? null,
    };
  }

  /** Gera (ou regenera) a chave — o valor puro só é devolvido aqui, nunca mais. */
  async generate(companyId: string): Promise<{ apiKey: string }> {
    const plain = `tc_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = plain.slice(0, PREFIX_LENGTH);
    const hash = await this.passwordService.hash(plain);

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        timeClockApiKeyHash: hash,
        timeClockApiKeyPrefix: prefix,
        timeClockApiKeyCreatedAt: new Date(),
      },
    });

    return { apiKey: plain };
  }

  async revoke(companyId: string) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        timeClockApiKeyHash: null,
        timeClockApiKeyPrefix: null,
        timeClockApiKeyCreatedAt: null,
      },
    });
  }

  /** Resolve a companyId dona da chave puro informada, ou null se não bater com nenhuma. */
  async resolveCompanyId(apiKey: string): Promise<string | null> {
    if (!apiKey || apiKey.length < PREFIX_LENGTH) {
      return null;
    }

    const prefix = apiKey.slice(0, PREFIX_LENGTH);

    const company = await this.prisma.company.findFirst({
      where: { timeClockApiKeyPrefix: prefix },
      select: { id: true, timeClockApiKeyHash: true },
    });

    if (!company?.timeClockApiKeyHash) {
      return null;
    }

    const matches = await this.passwordService.compare(
      apiKey,
      company.timeClockApiKeyHash,
    );

    return matches ? company.id : null;
  }
}
