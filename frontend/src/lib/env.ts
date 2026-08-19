// Caminho relativo por padrão: o navegador sempre chama o próprio
// domínio do frontend, que repassa pro backend de verdade por baixo
// dos panos (ver `rewrites()` em next.config.ts) — assim cookie de
// sessão e CORS nunca viram problema entre domínios diferentes.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const env = {
  apiUrl,

  // Base para arquivos estáticos (uploads), que ficam fora do
  // prefixo /api — ex.: `${apiOrigin}/uploads/branding/...`.
  apiOrigin: apiUrl.replace(/\/api\/?$/, ""),

  appName:
    process.env.NEXT_PUBLIC_APP_NAME ??
    "AlePejo ERP Cloud",
};
