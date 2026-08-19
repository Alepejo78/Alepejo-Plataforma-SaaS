/**
 * A partir de agora o acesso é sempre pelo link com a empresa
 * (`/<slug>/login`) — o genérico `/login` não tem mais formulário
 * próprio, só decide para onde mandar (ver `app/login/page.tsx`).
 * Pra isso funcionar sem pedir a empresa de novo a cada expiração de
 * sessão, o navegador lembra o último slug usado neste cookie —
 * legível tanto no cliente quanto no `middleware.ts` (não é httpOnly
 * de propósito, nada sensível aqui).
 */
export const COMPANY_SLUG_COOKIE = "alepejo_company_slug";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function rememberCompanySlug(slug: string): void {
  if (typeof document === "undefined" || !slug) {
    return;
  }

  document.cookie = `${COMPANY_SLUG_COOKIE}=${encodeURIComponent(
    slug
  )}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function getRememberedCompanySlug(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COMPANY_SLUG_COOKIE}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}
