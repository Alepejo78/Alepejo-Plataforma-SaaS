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
 * sameSite lax: o navegador envia o cookie em navegação normal, mas não
 *   em requisições cross-site de terceiros (proteção contra CSRF).
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
  sameSite: 'lax',
  path: '/',
});

export const accessTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions();

export const refreshTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions();

export const clearCookieOptions = (): CookieOptions =>
  baseCookieOptions();
