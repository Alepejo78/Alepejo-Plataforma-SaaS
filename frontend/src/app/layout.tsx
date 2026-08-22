import "./globals.css";

import { ThemeProvider } from "../providers/theme-provider";
import { AuthProvider } from "../providers/AuthProvider";
import { TabsProvider } from "../providers/TabsProvider";
import { BrandFooter } from "../components/layout/BrandFooter";
import { BrandColorStyle } from "../components/layout/BrandColorStyle";
import { MascoteFlutuante } from "../components/marketing/MascoteFlutuante";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <TabsProvider>
            <ThemeProvider>
              <BrandColorStyle />
              {children}
              <MascoteFlutuante />
              <BrandFooter />
            </ThemeProvider>
          </TabsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
