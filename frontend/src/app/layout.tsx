import "./globals.css";

import { ThemeProvider } from "../providers/theme-provider";
import { AuthProvider } from "../providers/AuthProvider";
import { TabsProvider } from "../providers/TabsProvider";
import { BrandFooter } from "../components/layout/BrandFooter";
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
