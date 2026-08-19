import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isPublicRoute } from "./lib/publicRoutes";
import { COMPANY_SLUG_COOKIE } from "./lib/companyLogin";

/**
 * Nomes definidos no backend em
 * identity/auth/constants/cookie.constants.ts — manter sincronizado.
 */
const ACCESS_TOKEN_COOKIE = "alepejo_at";
const REFRESH_TOKEN_COOKIE = "alepejo_rt";

/**
 * Domínio "de vitrine" (institucional/planos) — separado do domínio
 * do sistema (`app.<domínio>`) por decisão do usuário: quem digita o
 * domínio principal sem saber do sistema vê a apresentação, não uma
 * tela de login. Configurável via env pra não hardcodar em ambientes
 * de teste/preview.
 */
const MARKETING_HOSTNAMES = (
  process.env.NEXT_PUBLIC_MARKETING_HOSTNAMES ??
  "alepejo.com.br,www.alepejo.com.br"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Domínio principal (vitrine): raiz mostra a página institucional,
  // reescrita por baixo — a URL visível continua sendo só o domínio,
  // sem `/institucional` aparecendo. Roda ANTES de qualquer checagem
  // de sessão: institucional é sempre pública, em qualquer domínio.
  const hostname = request.headers.get("host") ?? "";

  if (MARKETING_HOSTNAMES.includes(hostname) && pathname === "/") {
    return NextResponse.rewrite(
      new URL("/institucional", request.url)
    );
  }

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

  // Empresa que este navegador usou da última vez (ver
  // lib/companyLogin.ts) — só ela sabe direcionar direto pro
  // `/<empresa>/login`, já que `/login` sozinho não tem mais
  // formulário. Sem esse cookie, cai no `/login` genérico mesmo, que
  // mostra a mensagem pra usar o link do e-mail.
  const companySlug = request.cookies.get(
    COMPANY_SLUG_COOKIE
  )?.value;

  if (!hasSession && !isPublicRoute(pathname)) {
    const loginUrl = new URL(
      companySlug ? `/${companySlug}/login` : "/login",
      request.url
    );

    loginUrl.searchParams.set(
      "from",
      `${pathname}${search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  // Visita direta em `/login` com a empresa já conhecida: pula a
  // mensagem intermediária e vai direto pro formulário certo.
  if (pathname === "/login" && companySlug) {
    const loginUrl = new URL(`/${companySlug}/login`, request.url);
    const from = request.nextUrl.searchParams.get("from");

    if (from) {
      loginUrl.searchParams.set("from", from);
    }

    return NextResponse.redirect(loginUrl);
  }

  // Importante: NÃO redirecionar para "/" quando há cookie e a rota é
  // pública. O middleware só sabe que o cookie EXISTE, não que ele é
  // válido. Se o cookie estiver expirado/revogado (ex.: banco resetado),
  // esse redirecionamento prendia o usuário: ele não conseguia chegar
  // ao /login para se reautenticar nem para sair.
  // Quem já tem sessão válida é levado para a home pelo próprio
  // formulário de login, após autenticar.

  // Com sessão e empresa conhecida (cookie atualizado a cada /auth/me,
  // ver AuthProvider), toda navegação passa a mostrar o nome da
  // empresa fixo na URL (`/<empresa>/os`, `/<empresa>/erp/...`) sem
  // precisar mover nenhuma página nem tocar nos `Link`/`router.push`
  // existentes (que continuam apontando pro caminho "puro", tipo
  // `/os`): aqui a gente só decide o que aparece na barra de endereço.
  if (hasSession && companySlug && !isPublicRoute(pathname)) {
    const segments = pathname.split("/").filter(Boolean);
    const [first, second] = segments;

    if (first === companySlug) {
      // Já veio com o slug. `/<empresa>/login` é página de verdade
      // (`app/[empresa]/login/page.tsx`) — não reescrever essa.
      if (second === "login") {
        return NextResponse.next();
      }

      // Reescreve por baixo pro caminho sem slug, que é o que
      // realmente existe no App Router — a URL visível continua com
      // o slug, só o conteúdo servido é que "não sabe" dele.
      const rewritten = request.nextUrl.clone();
      rewritten.pathname = `/${segments.slice(1).join("/")}`;

      return NextResponse.rewrite(rewritten);
    }

    // Veio sem slug (qualquer link/navegação antiga) — redireciona
    // pra versão com o nome da empresa, que é o que deve aparecer.
    const withSlug = request.nextUrl.clone();
    withSlug.pathname = `/${companySlug}${pathname}`;

    return NextResponse.redirect(withSlug);
  }

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
    "/((?!api|uploads|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
