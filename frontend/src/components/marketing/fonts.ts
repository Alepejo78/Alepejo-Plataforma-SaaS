import { Inter, Space_Grotesk } from "next/font/google";

/**
 * Tipografia própria das páginas de marketing da Assessoria (`/inicio`,
 * `/servicos`, `/servicos/planos`, `/trabalhe-conosco`) — carregada só
 * onde é importada (via `.variable`), nunca no `RootLayout`, pra não
 * mudar a fonte do ERP/painel (que usa Fira Sans/Code, ver
 * `app/layout.tsx`). Space Grotesk pros títulos: geométrica e um pouco
 * técnica, ecoa a origem "planilha/automação" da empresa sem cair no
 * default Poppins/Inter de landing page SaaS.
 */
export const marketingDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-marketing-display",
  display: "swap",
});

export const marketingBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing-body",
  display: "swap",
});

export const marketingFontVars = `${marketingDisplay.variable} ${marketingBody.variable}`;
