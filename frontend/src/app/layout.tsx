import "./globals.css";

import { ThemeProvider } from "../providers/theme-provider";
import { AuthProvider } from "../providers/AuthProvider";
import { BrandFooter } from "../components/layout/BrandFooter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <BrandFooter />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
