import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from '../../../core/security/encryption.service';

interface ResolvedSmtpConfig {
  /** company: SMTP próprio da empresa (nodemailer sempre). global: fallback do .env — usa Resend se RESEND_API_KEY estiver setada, senão nodemailer. */
  source: 'company' | 'global';
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * Envio de e-mail. Best-effort: nunca lança — quem chama `send()` não
 * precisa de try/catch, e uma falha aqui nunca deve derrubar o fluxo
 * principal (ex.: escolher vencedor de cotação).
 *
 * Cada empresa pode configurar seu próprio SMTP
 * (`/erp/configuracoes` → aba E-mail, `Company.smtp*`) — esse sempre
 * sai por nodemailer/SMTP, é credencial da própria empresa, fora do
 * nosso controle. Sem configuração própria (ou desligada), cai no
 * fallback global do `.env`: se `RESEND_API_KEY` estiver setada, sai
 * pela API do Resend (HTTPS — funciona em qualquer host, mesmo os que
 * bloqueiam porta SMTP, ex.: Railway fora do plano Pro); senão, cai
 * pro SMTP global (`SMTP_HOST` etc., bom pra dev local).
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
        source: 'company',
        host: company.smtpHost,
        port: company.smtpPort ?? 587,
        user: company.smtpUser,
        pass,
        from: company.smtpFromName
          ? `"${company.smtpFromName}" <${fromEmail}>`
          : fromEmail,
      };
    }

    if (process.env.RESEND_API_KEY) {
      return {
        source: 'global',
        host: '',
        port: 0,
        user: '',
        pass: '',
        from:
          process.env.RESEND_FROM_EMAIL ??
          (process.env.SMTP_USER as string),
      };
    }

    if (this.envConfigured()) {
      return {
        source: 'global',
        host: process.env.SMTP_HOST as string,
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
        from: process.env.SMTP_USER as string,
      };
    }

    return null;
  }

  private async sendViaResend(
    from: string,
    to: string,
    subject: string,
    html: string,
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const error =
          body?.message ?? `Resend respondeu ${response.status}`;

        this.logger.error(
          `Falha ao enviar e-mail (Resend) para ${to}: ${error}`,
        );

        return { sent: false, error };
      }

      return { sent: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Falha ao enviar e-mail (Resend) para ${to}: ${error}`,
      );

      return { sent: false, error };
    }
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

    if (config.source === 'global' && process.env.RESEND_API_KEY) {
      return this.sendViaResend(config.from, to, subject, html);
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      // Gmail (e outros) resolvem tanto IPv4 quanto IPv6 — em hosts
      // sem saída IPv6 (ex.: Railway), a tentativa em IPv6 falha com
      // ENETUNREACH em vez de cair pro IPv4. Força IPv4 direto (`family`
      // é repassado pro `net.connect` do Node, mas não está nos types
      // do nodemailer, daí o `as`).
      family: 4,
    } as SMTPTransport.Options & { family: number });

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
