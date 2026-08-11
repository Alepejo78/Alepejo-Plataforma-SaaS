import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import pino from 'pino';
import * as QRCode from 'qrcode';

export type WhatsAppStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_PENDING'
  | 'CONNECTED';

const AUTH_DIR = path.join(process.cwd(), 'whatsapp-auth');

/**
 * Integração com WhatsApp via Baileys (biblioteca não-oficial, pareia
 * via QR code com um número de WhatsApp normal — risco de bloqueio do
 * número pela Meta aceito pelo usuário, ver docs/08-Continuidade.md).
 * Sessão única, global ao sistema (mesmo padrão do
 * EmailNotificationsService: não é por empresa). `send()` é
 * best-effort — nunca lança, nunca deve travar quem chama.
 *
 * Baileys é um pacote ESM puro; o Backend compila para CommonJS
 * (`tsconfig.json`, sem "type": "module" no package.json), então o
 * import precisa ser dinâmico (`await import(...)`) — um `import`
 * estático daria `ERR_REQUIRE_ESM` em runtime.
 */
@Injectable()
export class WhatsappNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(
    WhatsappNotificationsService.name,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sock: any = null;
  private status: WhatsAppStatus = 'DISCONNECTED';
  private qrDataUrl: string | null = null;
  private connecting = false;

  async onModuleInit() {
    // Só reconecta sozinho se já existir uma sessão pareada antes
    // (credenciais salvas em disco) — o primeiro pareamento só
    // começa quando o usuário pede na tela (POST /connect).
    if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
      void this.connect();
    }
  }

  getStatus() {
    return { status: this.status, qr: this.qrDataUrl };
  }

  async connect() {
    if (this.connecting || this.status === 'CONNECTED') {
      return this.getStatus();
    }

    this.connecting = true;
    this.status = 'CONNECTING';
    this.qrDataUrl = null;

    try {
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
      } = await import('@whiskeysockets/baileys');

      const { state, saveCreds } =
        await useMultiFileAuthState(AUTH_DIR);

      const sock = makeWASocket({
        auth: state,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: pino({ level: 'silent' }) as any,
      });

      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'QR_PENDING';

          QRCode.toDataURL(qr)
            .then((url) => {
              this.qrDataUrl = url;
            })
            .catch((err) =>
              this.logger.error(
                `Falha ao gerar imagem do QR: ${err instanceof Error ? err.message : err}`,
              ),
            );
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrDataUrl = null;
          this.connecting = false;
          this.logger.log('WhatsApp conectado.');
        }

        if (connection === 'close') {
          this.connecting = false;

          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
            ?.output?.statusCode;
          const loggedOut =
            statusCode === DisconnectReason.loggedOut;

          if (loggedOut) {
            this.status = 'DISCONNECTED';
            this.qrDataUrl = null;
            this.sock = null;
            fs.rmSync(AUTH_DIR, {
              recursive: true,
              force: true,
            });
            this.logger.warn(
              'WhatsApp desconectado (logout) — sessão removida, será preciso parear de novo.',
            );
          } else {
            this.logger.warn(
              'Conexão do WhatsApp caiu, tentando reconectar...',
            );
            void this.connect();
          }
        }
      });
    } catch (err) {
      this.connecting = false;
      this.status = 'DISCONNECTED';
      this.logger.error(
        `Falha ao iniciar conexão do WhatsApp: ${err instanceof Error ? err.message : err}`,
      );
    }

    return this.getStatus();
  }

  async logout() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {
        // Segue o fluxo mesmo se der erro — a limpeza local abaixo
        // garante o reset independente da resposta do WhatsApp.
      }
    }

    this.sock = null;
    this.status = 'DISCONNECTED';
    this.qrDataUrl = null;
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });

    return this.getStatus();
  }

  async send(phone: string, message: string): Promise<boolean> {
    const { sent } = await this.sendVerbose(phone, message);

    return sent;
  }

  /** Mesmo envio de `send()`, mas devolve o motivo da falha — usado no endpoint de teste (diagnóstico manual, ver tela WhatsApp). */
  async sendVerbose(
    phone: string,
    message: string,
  ): Promise<{ sent: boolean; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.sock) {
      const error = 'WhatsApp não está conectado.';
      this.logger.warn(
        `${error} Mensagem para ${phone} não enviada.`,
      );

      return { sent: false, error };
    }

    const jid = this.toJid(phone);

    if (!jid) {
      const error = 'Número inválido (poucos dígitos).';
      this.logger.warn(`${error} Não enviado: ${phone}`);

      return { sent: false, error };
    }

    try {
      const digits = jid.replace('@s.whatsapp.net', '');
      const check = await this.sock.onWhatsApp(digits);
      const found = check?.[0];

      if (!found?.exists) {
        const error =
          'Este número não está registrado no WhatsApp (ou o app não confirmou a checagem).';
        this.logger.warn(`${error} Não enviado: ${phone}`);

        return { sent: false, error };
      }

      await this.sock.sendMessage(found.jid, { text: message });

      return { sent: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Falha ao enviar WhatsApp para ${phone}: ${error}`,
      );

      return { sent: false, error };
    }
  }

  /** Converte um telefone livre em JID do WhatsApp, assumindo Brasil (DDI 55) quando ausente. */
  private toJid(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 10) {
      return null;
    }

    const withCountryCode = digits.startsWith('55')
      ? digits
      : `55${digits}`;

    return `${withCountryCode}@s.whatsapp.net`;
  }
}
