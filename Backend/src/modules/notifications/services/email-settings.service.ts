import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';

import { EmailNotificationsService } from './email-notifications.service';
import { UpdateEmailSettingsDto } from '../dto/update-email-settings.dto';

@Injectable()
export class EmailSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  async getSettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPasswordEncrypted: true,
        smtpFromEmail: true,
        smtpFromName: true,
        smtpEnabled: true,
      },
    });

    return {
      host: company?.smtpHost ?? null,
      port: company?.smtpPort ?? null,
      user: company?.smtpUser ?? null,
      // A senha nunca volta pro frontend — só avisamos se já existe
      // uma salva, pra tela decidir se mostra "senha já configurada".
      hasPassword: Boolean(company?.smtpPasswordEncrypted),
      fromEmail: company?.smtpFromEmail ?? null,
      fromName: company?.smtpFromName ?? null,
      enabled: company?.smtpEnabled ?? false,
    };
  }

  async updateSettings(
    companyId: string,
    dto: UpdateEmailSettingsDto,
  ) {
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.host !== undefined && { smtpHost: dto.host }),
        ...(dto.port !== undefined && { smtpPort: dto.port }),
        ...(dto.user !== undefined && { smtpUser: dto.user }),
        ...(dto.password && {
          smtpPasswordEncrypted: this.encryption.encrypt(
            dto.password,
          ),
        }),
        ...(dto.fromEmail !== undefined && {
          smtpFromEmail: dto.fromEmail,
        }),
        ...(dto.fromName !== undefined && {
          smtpFromName: dto.fromName,
        }),
        ...(dto.enabled !== undefined && {
          smtpEnabled: dto.enabled,
        }),
      },
    });

    return this.getSettings(companyId);
  }

  async sendTest(companyId: string, to: string, message?: string) {
    return this.emailNotifications.sendVerbose(
      companyId,
      to,
      'E-mail de teste — AlePejo ERP',
      `<p>${
        message ??
        'Mensagem de teste do AlePejo ERP — se você recebeu isso, o envio de e-mail está funcionando.'
      }</p>`,
    );
  }
}
