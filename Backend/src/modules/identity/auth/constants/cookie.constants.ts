import type { CookieOptions } from 'express';

/**
 * Nomes dos cookies de sessão.
 * O frontend (middleware.ts do Next) depende destes nomes para saber
 * se existe sessão — se alterar aqui, alterar lá também.
 */
export const ACCESS_TOKEN_COOKIE = 'alepejo_at';
export const REFRESH_TOKEN_COOKIE = 'alepejo_rt';

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isProduction = (): boolean =>
  process.env.NODE_ENV === 'production';

/**
 * httpOnly: JavaScript não consegue ler o cookie (proteção contra XSS).
 * sameSite lax: o navegador envia o cookie em navegação normal, mas não
 *   em requisições cross-site de terceiros (proteção contra CSRF).
 * secure: só trafega em HTTPS. Desligado em dev para funcionar em
 *   http://localhost.
 */
const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax',
  path: '/',
});

export const accessTokenCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: ONE_HOUR_MS,
});

export const refreshTokenCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: SEVEN_DAYS_MS,
});

export const clearCookieOptions = (): CookieOptions =>
  baseCookieOptions();
