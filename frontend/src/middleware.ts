import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Nomes definidos no backend em
 * identity/auth/constants/cookie.constants.ts — manter sincronizado.
 */
const ACCESS_TOKEN_COOKIE = "alepejo_at";
const REFRESH_TOKEN_COOKIE = "alepejo_rt";

/** Rotas acessíveis sem sessão. */
const PUBLIC_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route || pathname.startsWith(`${route}/`)
  );

  const accessToken = request.cookies.get(
    ACCESS_TOKEN_COOKIE
  )?.value;

  const refreshToken = request.cookies.get(
    REFRESH_TOKEN_COOKIE
  )?.value;

  // O access token expira em 1h, bem antes do refresh (7 dias).
  // Se só o refresh existir, ainda há sessão válida: deixamos passar
  // e o interceptor do axios renova o access token na primeira chamada.
  const hasSession = Boolean(accessToken || refreshToken);

  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "from",
      `${pathname}${search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  // Importante: NÃO redirecionar para "/" quando há cookie e a rota é
  // pública. O middleware só sabe que o cookie EXISTE, não que ele é
  // válido. Se o cookie estiver expirado/revogado (ex.: banco resetado),
  // esse redirecionamento prendia o usuário: ele não conseguia chegar
  // ao /login para se reautenticar nem para sair.
  // Quem já tem sessão válida é levado para a home pelo próprio
  // formulário de login, após autenticar.

  return NextResponse.next();
}

/**
 * Protege tudo, exceto assets e rotas internas do Next.
 *
 * Observação de segurança: o middleware apenas verifica a PRESENÇA do
 * cookie — ele não valida a assinatura do JWT. Isso é intencional
 * (evita expor o segredo no edge runtime e uma chamada extra por
 * navegação). A autorização real continua no backend, que valida
 * token, licença e permissão a cada request.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
