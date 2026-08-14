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

const AUTH_BASE_DIR = path.join(process.cwd(), 'whatsapp-auth');

interface SessionState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock: any;
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  connecting: boolean;
}

function emptySession(): SessionState {
  return {
    sock: null,
    status: 'DISCONNECTED',
    qrDataUrl: null,
    connecting: false,
  };
}

/**
 * Integração com WhatsApp via Baileys (biblioteca não-oficial, pareia
 * via QR code com um número de WhatsApp normal — risco de bloqueio do
 * número pela Meta aceito pelo usuário, ver docs/08-Continuidade.md).
 *
 * Uma sessão POR EMPRESA (cada cliente pareia o próprio número,
 * independente dos outros — pedido explícito: "quando o cliente
 * comprar, esses dados vão todos vazio pra eles preencherem, o mesmo
 * será pro WhatsApp"). Cada empresa tem sua própria pasta de
 * credenciais em disco (`whatsapp-auth/<companyId>/`) e seu próprio
 * estado em memória (`sessions`, por companyId). `send()` é
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

  private sessions = new Map<string, SessionState>();

  private getSession(companyId: string): SessionState {
    let session = this.sessions.get(companyId);

    if (!session) {
      session = emptySession();
      this.sessions.set(companyId, session);
    }

    return session;
  }

  private authDir(companyId: string): string {
    return path.join(AUTH_BASE_DIR, companyId);
  }

  async onModuleInit() {
    // Só reconecta sozinho as empresas que já tinham sessão pareada
    // antes (credenciais salvas em disco) — o primeiro pareamento de
    // cada empresa só começa quando alguém pede na tela (POST
    // /connect).
    if (!fs.existsSync(AUTH_BASE_DIR)) {
      return;
    }

    const companyIds = fs
      .readdirSync(AUTH_BASE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((companyId) =>
        fs.existsSync(
          path.join(AUTH_BASE_DIR, companyId, 'creds.json'),
        ),
      );

    for (const companyId of companyIds) {
      void this.connect(companyId);
    }
  }

  getStatus(companyId: string) {
    const session = this.getSession(companyId);

    return { status: session.status, qr: session.qrDataUrl };
  }

  async connect(companyId: string) {
    const session = this.getSession(companyId);

    if (session.connecting || session.status === 'CONNECTED') {
      return this.getStatus(companyId);
    }

    session.connecting = true;
    session.status = 'CONNECTING';
    session.qrDataUrl = null;

    try {
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
      } = await import('@whiskeysockets/baileys');

      const { state, saveCreds } = await useMultiFileAuthState(
        this.authDir(companyId),
      );

      const sock = makeWASocket({
        auth: state,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: pino({ level: 'silent' }) as any,
      });

      session.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          session.status = 'QR_PENDING';

          QRCode.toDataURL(qr)
            .then((url) => {
              session.qrDataUrl = url;
            })
            .catch((err) =>
              this.logger.error(
                `Falha ao gerar imagem do QR (empresa ${companyId}): ${err instanceof Error ? err.message : err}`,
              ),
            );
        }

        if (connection === 'open') {
          session.status = 'CONNECTED';
          session.qrDataUrl = null;
          session.connecting = false;
          this.logger.log(`WhatsApp conectado (empresa ${companyId}).`);
        }

        if (connection === 'close') {
          session.connecting = false;

          const statusCode = (
            lastDisconnect?.error as {
              output?: { statusCode?: number };
            }
          )?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;

          if (loggedOut) {
            session.status = 'DISCONNECTED';
            session.qrDataUrl = null;
            session.sock = null;
            fs.rmSync(this.authDir(companyId), {
              recursive: true,
              force: true,
            });
            this.logger.warn(
              `WhatsApp desconectado (logout, empresa ${companyId}) — sessão removida, será preciso parear de novo.`,
            );
          } else {
            this.logger.warn(
              `Conexão do WhatsApp caiu (empresa ${companyId}), tentando reconectar...`,
            );
            void this.connect(companyId);
          }
        }
      });
    } catch (err) {
      session.connecting = false;
      session.status = 'DISCONNECTED';
      this.logger.error(
        `Falha ao iniciar conexão do WhatsApp (empresa ${companyId}): ${err instanceof Error ? err.message : err}`,
      );
    }

    return this.getStatus(companyId);
  }

  async logout(companyId: string) {
    const session = this.getSession(companyId);

    if (session.sock) {
      try {
        await session.sock.logout();
      } catch {
        // Segue o fluxo mesmo se der erro — a limpeza local abaixo
        // garante o reset independente da resposta do WhatsApp.
      }
    }

    session.sock = null;
    session.status = 'DISCONNECTED';
    session.qrDataUrl = null;
    fs.rmSync(this.authDir(companyId), {
      recursive: true,
      force: true,
    });

    return this.getStatus(companyId);
  }

  async send(
    companyId: string,
    phone: string,
    message: string,
  ): Promise<boolean> {
    const { sent } = await this.sendVerbose(
      companyId,
      phone,
      message,
    );

    return sent;
  }

  /** Mesmo envio de `send()`, mas devolve o motivo da falha — usado no endpoint de teste (diagnóstico manual, ver tela WhatsApp). */
  async sendVerbose(
    companyId: string,
    phone: string,
    message: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const session = this.getSession(companyId);

    if (session.status !== 'CONNECTED' || !session.sock) {
      const error = 'WhatsApp não está conectado.';
      this.logger.warn(
        `${error} Mensagem para ${phone} não enviada (empresa ${companyId}).`,
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
      const check = await session.sock.onWhatsApp(digits);
      const found = check?.[0];

      if (!found?.exists) {
        const error =
          'Este número não está registrado no WhatsApp (ou o app não confirmou a checagem).';
        this.logger.warn(`${error} Não enviado: ${phone}`);

        return { sent: false, error };
      }

      await session.sock.sendMessage(found.jid, { text: message });

      return { sent: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Falha ao enviar WhatsApp para ${phone} (empresa ${companyId}): ${error}`,
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
