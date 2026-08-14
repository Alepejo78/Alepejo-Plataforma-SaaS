import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Criptografia reversível pra segredos que o sistema precisa usar de
 * novo depois (ex.: senha de SMTP pra autenticar no servidor) —
 * diferente de PasswordService, que só faz hash (nunca reversível).
 * Chave derivada de uma variável de ambiente com SHA-256 (sempre 32
 * bytes, do tamanho certo pra AES-256).
 */
@Injectable()
export class EncryptionService {
  private getKey(): Buffer {
    const secret =
      process.env.ENCRYPTION_KEY ??
      process.env.JWT_SECRET ??
      'alepejo-secret';

    return crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(value: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      this.getKey(),
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, authTagB64, dataB64] = payload.split('.');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.getKey(),
      Buffer.from(ivB64, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
