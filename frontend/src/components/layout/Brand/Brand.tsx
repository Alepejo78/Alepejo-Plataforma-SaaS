"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { systemConfig } from "@/config/system";
import { useAuth } from "@/providers/AuthProvider";
import { brandingAssetUrl } from "@/services/company-branding.service";

/**
 * O que estoura a largura da coluna é a MAIOR palavra, não o
 * tamanho total do nome (frases quebram linha; uma palavra sozinha
 * não — nunca separamos palavras). Por isso o tamanho da fonte é
 * escolhido pela palavra mais longa.
 */
function fitFontSizeClass(name: string) {
  const longestWord = Math.max(
    0,
    ...name.split(/\s+/).map((word) => word.length)
  );

  if (longestWord <= 8) {
    return "text-2xl";
  }

  if (longestWord <= 12) {
    return "text-lg";
  }

  if (longestWord <= 16) {
    return "text-sm";
  }

  return "text-xs";
}

export function Brand() {
  const { company, systemName } = systemConfig;
  const { user, hasModule } = useAuth();

  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const brandingLicensed = hasModule("BRANDING");
  const branded = brandingLicensed ? user?.company : null;

  // O tema escuro só é alcançável quando a empresa liberou o próprio
  // alternador (ver toggle "themeToggleEnabled") — sem isso o
  // ThemeProvider trava tudo no claro. Checar os dois aqui (em vez de
  // confiar só no tema resolvido) evita usar a logo escura por engano
  // quando o alternador está desabilitado.
  const isDark =
    mounted &&
    Boolean(branded?.brandingThemeToggleEnabled) &&
    resolvedTheme === "dark";

  const customLogo = isDark
    ? branded?.brandingLogoDarkEnabled
      ? (branded.logoDark ?? branded.logo)
      : null
    : branded?.brandingLogoLightEnabled
      ? branded.logo
      : null;

  const logo =
    brandingAssetUrl(customLogo) ??
    (isDark ? company.logoDark : company.logo);

  const customName =
    branded?.brandingSystemNameEnabled && branded.systemName
      ? branded.systemName
      : null;

  const displayName = customName || company.name;

  // 23,5% menor que o logoWidth configurado (dois ajustes pedidos em
  // sequência: -10%, depois mais -15% em cima disso) — só a exibição
  // na barra do topo, não mexe no valor cadastrado em Personalização.
  const logoSize = company.logoWidth * 0.9 * 0.85;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element --
          logo pode vir de um host externo (upload de personalização),
          o que exigiria configurar remotePatterns por ambiente. */}
      <img
        key={logo}
        src={logo}
        alt={displayName}
        className="shrink-0 max-w-none object-contain"
        style={{ width: logoSize, height: logoSize }}
      />

      <div className="min-w-0 flex-1">
        <h1
          className={`font-bold text-[var(--text-primary)] ${
            customName
              ? `${fitFontSizeClass(displayName)} text-center leading-tight`
              : "text-2xl truncate"
          }`}
        >
          {displayName}
        </h1>

        {!customName && (
          <p className="truncate text-sm text-[var(--text-secondary)]">
            {systemName}
          </p>
        )}
      </div>
    </div>
  );
}
