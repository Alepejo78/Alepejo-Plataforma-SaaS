import "./globals.css";

import { Fira_Code, Fira_Sans } from "next/font/google";

import { ThemeProvider } from "../providers/theme-provider";
import { AuthProvider } from "../providers/AuthProvider";
import { TabsProvider } from "../providers/TabsProvider";
import { ShowLockedModulesProvider } from "../providers/ShowLockedModulesProvider";
import { BrandFooter } from "../components/layout/BrandFooter";
import { BrandColorStyle } from "../components/layout/BrandColorStyle";
import { MascoteFlutuante } from "../components/marketing/MascoteFlutuante";

/*
 * Fira Sans no texto e Fira Code nos números/monoespaçado: é o par que
 * a análise de UI indicou pra painel de dados — dígitos de mesma
 * largura deixam as colunas de valor alinhadas, que é o que mais se lê
 * num ERP. Servido pelo next/font (baixado no build, sem chamada a
 * servidor de fonte em tempo de execução).
 */
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-app",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-app",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${firaSans.variable} ${firaCode.variable}`}
    >
      <body>
        <AuthProvider>
          <ShowLockedModulesProvider>
            <TabsProvider>
              <ThemeProvider>
                <BrandColorStyle />
                {children}
                <MascoteFlutuante />
                <BrandFooter />
              </ThemeProvider>
            </TabsProvider>
          </ShowLockedModulesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
