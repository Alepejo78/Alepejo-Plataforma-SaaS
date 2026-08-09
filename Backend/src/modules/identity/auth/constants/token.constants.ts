import type { SignOptions } from 'jsonwebtoken';

/**
 * Duração dos tokens, lida do .env — fonte única usada tanto por
 * auth.module.ts (default do JwtModule) quanto por auth.service.ts
 * (assinatura de cada token), pra não duplicar o valor em dois
 * lugares que podem ficar dessincronizados.
 *
 * Tipado como `SignOptions['expiresIn']` (não `string`) porque a lib
 * `jsonwebtoken` só aceita um formato específico de duração — o valor
 * vem do .env em tempo de execução, então o cast é necessário.
 */
export const ACCESS_TOKEN_EXPIRES_IN = (process.env
  .JWT_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];

export const REFRESH_TOKEN_EXPIRES_IN = (process.env
  .JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
