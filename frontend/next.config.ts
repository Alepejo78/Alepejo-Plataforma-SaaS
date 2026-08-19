import type { NextConfig } from "next";

/**
 * URL real do backend (nunca exposta ao navegador) — usada só aqui,
 * no servidor do Next, pra repassar `/api/*` e `/uploads/*` por baixo
 * dos panos. Sem isso, o navegador chamaria o backend direto (outro
 * domínio em produção — Vercel x Railway), e o cookie de sessão do
 * backend nunca chegaria no domínio do frontend pro middleware ler.
 * Com o rewrite, tudo vira mesma origem pro navegador — cookie,
 * sessão e CORS deixam de ser problema.
 */
const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
