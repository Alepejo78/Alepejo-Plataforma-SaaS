import type { CookieOptions } from 'express';

/**
 * Nomes dos cookies de sessão.
 * O frontend (middleware.ts do Next) depende destes nomes para saber
 * se existe sessão — se alterar aqui, alterar lá também.
 */
export const ACCESS_TOKEN_COOKIE = 'alepejo_at';
export const REFRESH_TOKEN_COOKIE = 'alepejo_rt';

const isProduction = (): boolean =>
  process.env.NODE_ENV === 'production';

/**
 * httpOnly: JavaScript não consegue ler o cookie (proteção contra XSS).
 * sameSite: em dev, frontend e backend são "same-site" (mesmo host
 *   `localhost`, só porta diferente) — `lax` já basta e é mais
 *   restritivo contra CSRF. Em produção, frontend (Vercel,
 *   `app.alepejo.com.br`) e backend (Railway, `up.railway.app`) são
 *   domínios DIFERENTES de verdade — toda chamada do frontend pro
 *   backend é cross-site, e `lax` bloqueia o navegador de enviar o
 *   cookie nela (o login "funcionava" mas a sessão seguinte dizia
 *   "não encontrada"). Por isso `none` em produção — exige `secure:
 *   true` junto, que já é o caso.
 * secure: só trafega em HTTPS. Desligado em dev para funcionar em
 *   http://localhost.
 *
 * Sem `maxAge`: cookie de sessão — o navegador apaga ao fechar (a
 * pedido do usuário, para não continuar logado depois de fechar o
 * navegador). O token em si continua expirando no prazo normal
 * (JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN) — isso só controla até
 * quando o navegador guarda o cookie.
 */
const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/',
});

export const accessTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions();

export const refreshTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions();

export const clearCookieOptions = (): CookieOptions =>
  baseCookieOptions();
