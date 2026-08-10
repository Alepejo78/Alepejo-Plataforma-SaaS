import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Envio de e-mail via SMTP genérico (nodemailer), sem provedor
 * dedicado. Best-effort: nunca lança — quem chama `send()` não
 * precisa de try/catch, e uma falha aqui nunca deve derrubar o
 * fluxo principal (ex.: escolher vencedor de cotação).
 */
@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(
    EmailNotificationsService.name,
  );

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS,
    );
  }

  private getTransporter() {
    if (!this.isConfigured()) {
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP não configurado — e-mail para ${to} não enviado.`,
      );

      return false;
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        html,
      });

      return true;
    } catch (err) {
      this.logger.error(
        `Falha ao enviar e-mail para ${to}: ${
          err instanceof Error ? err.message : err
        }`,
      );

      return false;
    }
  }
}
