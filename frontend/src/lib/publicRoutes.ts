/**
 * Rotas acessíveis sem sessão — as portas de entrada de quem ainda não
 * tem (ou perdeu) o acesso:
 * - `/login`: entrada normal.
 * - `/definir-senha`: link enviado por e-mail pro usuário novo criar a
 *   própria senha. O usuário aqui ainda NÃO tem senha nenhuma, então
 *   mandá-lo pro login o deixa sem nenhuma forma de entrar.
 * - `/cadastro-empresa`: "Criar conta" do login — cliente novo, por
 *   definição sem sessão.
 * - `/esqueci-senha`: quem esqueceu a senha não consegue logar pra
 *   pedir o link.
 * - `/planos`: página pública de preços, antes de qualquer cadastro.
 * - `/checkout`: "Comprar agora" — paga antes do cadastro existir, então
 *   por definição não há sessão nenhuma aqui.
 * - `/institucional`: página pública de apresentação do sistema
 *   (funcionalidades, demonstração e contato), porta de entrada antes
 *   de `/planos`.
 * - `/privacidade`: Política de Privacidade — precisa ser acessível sem
 *   login (é referenciada no cadastro, antes de qualquer conta existir).
 * - `/<empresa>/login`: login com o nome da empresa fixo na URL — o
 *   link que o e-mail de "definir senha" passa a mostrar como o
 *   acesso permanente do usuário (ver `sendPasswordResetLink` no
 *   backend). Mesmo formulário de `/login`, só com o slug resolvido
 *   pra mostrar o nome da empresa acima do formulário.
 *
 * Usado nos TRÊS pontos que bloqueiam navegação sem sessão:
 * `middleware.ts` (servidor), `AuthProvider` (cliente, no 401 de
 * `/auth/me`) e `services/api.ts` (cliente, no 401 de qualquer
 * request). Os três precisam concordar: se só um souber que a rota é
 * pública, os outros derrubam o usuário pro login mesmo assim — foi
 * exatamente esse desencontro que quebrou o convite por e-mail.
 */
export const PUBLIC_ROUTES = [
  "/login",
  "/definir-senha",
  "/cadastro-empresa",
  "/esqueci-senha",
  "/planos",
  "/checkout",
  "/institucional",
  "/privacidade",
] as const;

/** `/<slug>/login` — exatamente dois segmentos, o segundo literalmente "login". */
const COMPANY_LOGIN_PATTERN = /^\/[^/]+\/login\/?$/;

export function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) || COMPANY_LOGIN_PATTERN.test(pathname)
  );
}

/**
 * Mesma lista usada em `middleware.ts` pra decidir quando reescrever
 * "/" pra `/institucional` — precisa ser `NEXT_PUBLIC_*` porque
 * também é lida no cliente (ver `isMarketingHomepage` abaixo).
 */
const MARKETING_HOSTNAMES = (
  process.env.NEXT_PUBLIC_MARKETING_HOSTNAMES ??
  "alepejo.com.br,www.alepejo.com.br"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/**
 * A "/" do domínio principal é institucional por baixo dos panos
 * (reescrita no middleware), mas a URL que o navegador mostra continua
 * sendo só "/" — que não está em `PUBLIC_ROUTES`. Sem esse caso
 * especial, o `AuthProvider` e o `api.ts` viam o 401 de `/auth/me` (a
 * página institucional nunca tem sessão) e mandavam o visitante direto
 * pro `/login`, atropelando a página institucional antes dela nem
 * terminar de carregar.
 */
export function isMarketingHomepage(
  pathname: string,
  hostname: string
): boolean {
  return pathname === "/" && MARKETING_HOSTNAMES.includes(hostname);
}
