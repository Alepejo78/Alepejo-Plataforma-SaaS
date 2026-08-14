import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';

interface ResolvedSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * Envio de e-mail via SMTP (nodemailer). Best-effort: nunca lança —
 * quem chama `send()` não precisa de try/catch, e uma falha aqui
 * nunca deve derrubar o fluxo principal (ex.: escolher vencedor de
 * cotação).
 *
 * Cada empresa pode configurar seu próprio SMTP
 * (`/erp/configuracoes` → aba E-mail, `Company.smtp*`). Sem
 * configuração própria (ou desligada), cai no SMTP global do `.env`
 * — mantém funcionando pra quem ainda não configurou nada.
 */
@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(
    EmailNotificationsService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private envConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS,
    );
  }

  private async resolveConfig(
    companyId: string,
  ): Promise<ResolvedSmtpConfig | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        smtpEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPasswordEncrypted: true,
        smtpFromEmail: true,
        smtpFromName: true,
      },
    });

    if (
      company?.smtpEnabled &&
      company.smtpHost &&
      company.smtpUser &&
      company.smtpPasswordEncrypted
    ) {
      const pass = this.encryption.decrypt(
        company.smtpPasswordEncrypted,
      );

      const fromEmail = company.smtpFromEmail || company.smtpUser;

      return {
        host: company.smtpHost,
        port: company.smtpPort ?? 587,
        user: company.smtpUser,
        pass,
        from: company.smtpFromName
          ? `"${company.smtpFromName}" <${fromEmail}>`
          : fromEmail,
      };
    }

    if (this.envConfigured()) {
      return {
        host: process.env.SMTP_HOST as string,
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
        from: process.env.SMTP_USER as string,
      };
    }

    return null;
  }

  async isConfigured(companyId: string): Promise<boolean> {
    return Boolean(await this.resolveConfig(companyId));
  }

  async send(
    companyId: string,
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    const result = await this.sendVerbose(
      companyId,
      to,
      subject,
      html,
    );

    return result.sent;
  }

  /**
   * Igual `send()`, mas devolve o motivo real da falha em vez de só
   * logar — usado pelo botão "Enviar e-mail de teste" da tela de
   * Configurações, pra diagnosticar sem precisar mexer num fluxo de
   * verdade.
   */
  async sendVerbose(
    companyId: string,
    to: string,
    subject: string,
    html: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const config = await this.resolveConfig(companyId);

    if (!config) {
      const error = 'SMTP não configurado para esta empresa.';

      this.logger.warn(
        `${error} (empresa ${companyId}) — e-mail para ${to} não enviado.`,
      );

      return { sent: false, error };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    try {
      await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
      });

      return { sent: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Falha ao enviar e-mail para ${to}: ${error}`,
      );

      return { sent: false, error };
    }
  }
}
