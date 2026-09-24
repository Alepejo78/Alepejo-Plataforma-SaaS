import {
  Bricolage_Grotesque,
  Figtree,
  Fraunces,
  Inter,
  Instrument_Sans,
  Space_Grotesk,
} from "next/font/google";

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

/**
 * Tipografia do AlePejo Serviços (`/servicos`): Fraunces (serifada de
 * contraste, calorosa — combina com o dourado/café da marca) nos títulos
 * e Figtree (geométrica e muito legível) no texto. Só é carregada onde
 * `servicosFontVars` é usado.
 */
export const servicosDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-servicos-display",
  display: "swap",
});

export const servicosBody = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-servicos-body",
  display: "swap",
});

export const servicosFontVars = `${servicosDisplay.variable} ${servicosBody.variable}`;

/**
 * Tipografia do AlePejo ERP (/institucional): Bricolage Grotesque nos
 * títulos e Instrument Sans no texto.
 */
export const erpDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-erp-display",
  display: "swap",
});

export const erpBody = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-erp-body",
  display: "swap",
});

export const erpFontVars = `${erpDisplay.variable} ${erpBody.variable}`;
