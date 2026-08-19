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
 *
 * O refresh token é reemitido a cada uso (ver `AuthService.refresh`,
 * rotação a cada chamada) — por isso a duração dele funciona como
 * "tempo de inatividade": 1h sem nenhuma requisição autenticada (o
 * access token, mais curto, é quem dispara o refresh silencioso) e o
 * refresh token expira também, forçando novo login. Decisão explícita
 * do usuário (19-08-2026): sessão não deve durar indefinidamente só
 * porque o navegador não fechou "de verdade" (ver docs/08-Continuidade.md).
 */
export const ACCESS_TOKEN_EXPIRES_IN = (process.env
  .JWT_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];

export const REFRESH_TOKEN_EXPIRES_IN = (process.env
  .JWT_REFRESH_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];
