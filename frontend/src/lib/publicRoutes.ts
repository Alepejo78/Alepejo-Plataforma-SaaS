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
 * - `/institucional`: página pública de apresentação do sistema
 *   (funcionalidades, demonstração e contato), porta de entrada antes
 *   de `/planos`.
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
  "/institucional",
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
