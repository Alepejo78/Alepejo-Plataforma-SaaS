"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

import { menu } from "@/components/layout/Sidebar/menu";
import { isMenuGroup } from "@/components/layout/Sidebar/Sidebar.types";
import { isOsPath, OS_PATH_TITLES } from "@/lib/osRoutes";
import { getRememberedCompanySlug } from "@/lib/companyLogin";
import { useAuth } from "@/providers/AuthProvider";

export type AppKey = "erp" | "os";

export interface TabEntry {
  href: string;
  title: string;
}

interface AppTabsState {
  openTabs: TabEntry[];
  activeHref: string;
}

interface TabsContextValue {
  currentApp: AppKey;
  openApps: AppKey[];
  erp: AppTabsState;
  os: AppTabsState;
  maxTabs: number;
  capMessage: string | null;
  /** Abre (ou reaproveita) uma guia e navega — false se bloqueado pelo limite. */
  openTab: (app: AppKey, entry: TabEntry) => boolean;
  closeTab: (app: AppKey, href: string) => void;
  /** Abre (ou só troca pra) a guia do app — sempre volta pra onde a pessoa parou nele. */
  openApp: (app: AppKey) => void;
  /** Fecha a guia do app — não fecha se for a única aberta. */
  closeApp: (app: AppKey) => void;
  /**
   * Sidebar do ERP fica aqui (não em estado local do `AppShell`) porque
   * cada página tem sua própria instância de `AppShell` — um `useState`
   * local perderia o valor a cada navegação. Aberto/fechado é escolha
   * do usuário, não muda sozinho ao navegar.
   */
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(
  undefined
);

const MAX_TABS = 6;

export const APP_LABEL: Record<AppKey, string> = {
  erp: "Sistema ERP",
  os: "OS",
};

const HOME_TAB: Record<AppKey, TabEntry> = {
  erp: { href: "/", title: "Visão geral" },
  os: { href: "/os", title: "OS" },
};

const STORAGE_KEY: Record<AppKey, string> = {
  erp: "alepejo:tabs:erp",
  os: "alepejo:tabs:os",
};

const APPS_STORAGE_KEY = "alepejo:apps";

function loadOpenApps(): AppKey[] {
  if (typeof window === "undefined") {
    return ["erp"];
  }

  try {
    const raw = window.sessionStorage.getItem(APPS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AppKey[]) : null;

    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      return ["erp"];
    }

    return parsed;
  } catch {
    return ["erp"];
  }
}

function loadFromStorage(app: AppKey): AppTabsState {
  const home = HOME_TAB[app];

  if (typeof window === "undefined") {
    return { openTabs: [home], activeHref: home.href };
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY[app]);

    if (!raw) {
      return { openTabs: [home], activeHref: home.href };
    }

    const parsed = JSON.parse(raw) as AppTabsState;

    if (!parsed.openTabs?.some((tab) => tab.href === home.href)) {
      parsed.openTabs = [home, ...(parsed.openTabs ?? [])];
    }

    return parsed;
  } catch {
    return { openTabs: [home], activeHref: home.href };
  }
}

function saveToStorage(app: AppKey, state: AppTabsState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    STORAGE_KEY[app],
    JSON.stringify(state)
  );
}

/** `href` -> título, achatando `menu.ts` (grupos + itens soltos). */
const erpMenuTitles: Record<string, string> = (() => {
  const titles: Record<string, string> = {};

  for (const entry of menu) {
    if (isMenuGroup(entry)) {
      for (const child of entry.children) {
        titles[child.href] = child.title;
      }
    } else {
      titles[entry.href] = entry.title;
    }
  }

  return titles;
})();

function titleFor(app: AppKey, pathname: string): string | null {
  if (app === "os") {
    return OS_PATH_TITLES[pathname] ?? null;
  }

  return erpMenuTitles[pathname] ?? null;
}

/** Só telas "principais" (as que aparecem no menu/nos cards) viram guia — subtelas ficam de fora. */
function isTabEligible(app: AppKey, pathname: string): boolean {
  return titleFor(app, pathname) !== null;
}

/**
 * `usePathname()` reflete a URL visível no navegador — com sessão e
 * empresa conhecida, o middleware faz o navegador mostrar
 * `/<empresa>/erp/...`/`/<empresa>/os/...` (rewrite por baixo pro
 * caminho sem o slug, que é o que as páginas realmente servem — ver
 * `middleware.ts`). Toda comparação de rota deste arquivo (`isOsPath`,
 * `HOME_TAB`, `OS_PATH_TITLES`, `erpMenuTitles`) usa os caminhos SEM
 * slug — sem essa normalização, nada aqui reconhece a rota atual
 * (guia nunca abre sozinha, `currentApp` sempre cai pro "erp"), que é
 * exatamente o sintoma da guia "grudada" na guia errada.
 */
export function stripCompanySlug(pathname: string): string {
  const slug = getRememberedCompanySlug();

  if (!slug) {
    return pathname;
  }

  if (pathname === `/${slug}`) {
    return "/";
  }

  if (pathname.startsWith(`/${slug}/`)) {
    return pathname.slice(slug.length + 1);
  }

  return pathname;
}

export function TabsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = stripCompanySlug(usePathname() ?? "/");
  const router = useRouter();
  const { user } = useAuth();

  // Sempre inicializa com o default (nunca lê sessionStorage aqui) —
  // no servidor `window` não existe, então o SSR sempre geraria esse
  // mesmo default; se o client-side lesse o storage já na primeira
  // renderização, o HTML hidratado divergiria do HTML do servidor
  // (hydration mismatch), o que faz o React descartar e remontar essa
  // sub-árvore e deixa os cliques dos botões de fechar guia presos a
  // elementos já substituídos (aparentam não fazer nada). O estado
  // real do sessionStorage só é aplicado depois, no efeito abaixo.
  const [erp, setErp] = useState<AppTabsState>(() => ({
    openTabs: [HOME_TAB.erp],
    activeHref: HOME_TAB.erp.href,
  }));
  const [os, setOs] = useState<AppTabsState>(() => ({
    openTabs: [HOME_TAB.os],
    activeHref: HOME_TAB.os.href,
  }));
  const [openApps, setOpenAppsState] = useState<AppKey[]>(["erp"]);
  const [hydrated, setHydrated] = useState(false);
  const [capMessage, setCapMessage] = useState<string | null>(
    null
  );
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setErp(loadFromStorage("erp"));
    setOs(loadFromStorage("os"));
    setOpenAppsState(loadOpenApps());
    setHydrated(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((value) => !value);
  }, []);

  const setOpenApps = useCallback((next: AppKey[]) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        APPS_STORAGE_KEY,
        JSON.stringify(next)
      );
    }

    setOpenAppsState(next);
  }, []);

  // Zera guias/sidebar ao perder a sessão (logout ou expiração) — senão
  // o próximo login (mesma aba) reabre exatamente onde a sessão anterior
  // tinha parado, guias de outro usuário incluídas.
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (user) {
      wasAuthenticated.current = true;

      return;
    }

    if (!wasAuthenticated.current) {
      return;
    }

    wasAuthenticated.current = false;

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY.erp);
      window.sessionStorage.removeItem(STORAGE_KEY.os);
      window.sessionStorage.removeItem(APPS_STORAGE_KEY);
    }

    setErp({ openTabs: [HOME_TAB.erp], activeHref: HOME_TAB.erp.href });
    setOs({ openTabs: [HOME_TAB.os], activeHref: HOME_TAB.os.href });
    setOpenAppsState(["erp"]);
    setSidebarOpen(false);
  }, [user]);

  const currentApp: AppKey = isOsPath(pathname) ? "os" : "erp";

  const stateFor = useCallback(
    (app: AppKey) => (app === "erp" ? erp : os),
    [erp, os]
  );

  const setStateFor = useCallback(
    (app: AppKey, next: AppTabsState) => {
      saveToStorage(app, next);

      if (app === "erp") {
        setErp(next);
      } else {
        setOs(next);
      }
    },
    []
  );

  // Garante que o app da URL atual sempre tem guia aberta na barra —
  // cobre acesso direto por link/favorito a um app ainda fechado.
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!openApps.includes(currentApp)) {
      setOpenApps([...openApps, currentApp]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentApp, hydrated]);

  // Mantém a guia ativa em sincronia com a URL real — cobre navegação
  // que não passou por openTab (link solto numa tela, voltar do
  // navegador). Subtelas (fora do menu/cards) não mexem nas guias.
  // Espera `hydrated` pra não rodar antes do estado real (do
  // sessionStorage) ter sido carregado — senão adicionaria a guia em
  // cima do estado default, que logo seria sobrescrito.
  useEffect(() => {
    if (!hydrated || !isTabEligible(currentApp, pathname)) {
      return;
    }

    const current = stateFor(currentApp);

    if (current.activeHref === pathname) {
      return;
    }

    const alreadyOpen = current.openTabs.some(
      (tab) => tab.href === pathname
    );

    if (alreadyOpen) {
      setStateFor(currentApp, {
        ...current,
        activeHref: pathname,
      });

      return;
    }

    const title = titleFor(currentApp, pathname) ?? pathname;

    // Navegação solta (link "Voltar" dentro da tela, botão voltar do
    // navegador, URL colada direto) pra uma guia ainda não aberta —
    // troca o CONTEÚDO da guia ativa no lugar dela, em vez de acumular
    // guia nova (guia nova de verdade só nasce clicando em algo do
    // menu/cards, que passa por `openTab`). A guia Home nunca é
    // substituída (é sempre fixa).
    const activeIndex = current.openTabs.findIndex(
      (tab) => tab.href === current.activeHref
    );
    const canReplace =
      activeIndex !== -1 &&
      current.openTabs[activeIndex].href !== HOME_TAB[currentApp].href;

    if (canReplace) {
      const nextTabs = current.openTabs.map((tab, i) =>
        i === activeIndex ? { href: pathname, title } : tab
      );

      setStateFor(currentApp, {
        openTabs: nextTabs,
        activeHref: pathname,
      });

      return;
    }

    if (current.openTabs.length >= MAX_TABS) {
      // Chegou aqui por fora do openTab (ex.: URL colada direto) —
      // deixa acessar mesmo passando do limite, só não vira guia fixa.
      setStateFor(currentApp, {
        ...current,
        activeHref: pathname,
      });

      return;
    }

    setStateFor(currentApp, {
      openTabs: [...current.openTabs, { href: pathname, title }],
      activeHref: pathname,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentApp, hydrated]);

  useEffect(() => {
    if (!capMessage) {
      return;
    }

    const timeout = setTimeout(() => setCapMessage(null), 4000);

    return () => clearTimeout(timeout);
  }, [capMessage]);

  const openTab = useCallback(
    (app: AppKey, entry: TabEntry): boolean => {
      const current = stateFor(app);
      const alreadyOpen = current.openTabs.some(
        (tab) => tab.href === entry.href
      );

      if (!alreadyOpen && current.openTabs.length >= MAX_TABS) {
        setCapMessage(
          `Limite de ${MAX_TABS} guias abertas atingido — feche uma guia antes de abrir outra.`
        );

        return false;
      }

      const nextTabs = alreadyOpen
        ? current.openTabs
        : [...current.openTabs, entry];

      setStateFor(app, {
        openTabs: nextTabs,
        activeHref: entry.href,
      });

      router.push(entry.href);

      return true;
    },
    [stateFor, setStateFor, router]
  );

  const closeTab = useCallback(
    (app: AppKey, href: string) => {
      const current = stateFor(app);

      if (href === HOME_TAB[app].href) {
        return;
      }

      const index = current.openTabs.findIndex(
        (tab) => tab.href === href
      );

      if (index === -1) {
        return;
      }

      const nextTabs = current.openTabs.filter(
        (tab) => tab.href !== href
      );

      const wasActive = current.activeHref === href;
      const fallback =
        nextTabs[index - 1] ?? nextTabs[0] ?? HOME_TAB[app];

      setStateFor(app, {
        openTabs: nextTabs,
        activeHref: wasActive ? fallback.href : current.activeHref,
      });

      if (wasActive) {
        router.push(fallback.href);
      }
    },
    [stateFor, setStateFor, router]
  );

  const openApp = useCallback(
    (app: AppKey) => {
      if (!openApps.includes(app)) {
        setOpenApps([...openApps, app]);
      }

      router.push(stateFor(app).activeHref);
    },
    [openApps, setOpenApps, router, stateFor]
  );

  const closeApp = useCallback(
    (app: AppKey) => {
      if (openApps.length <= 1) {
        return;
      }

      const next = openApps.filter((entry) => entry !== app);

      setOpenApps(next);

      if (currentApp === app) {
        const fallback = next[next.length - 1];

        router.push(stateFor(fallback).activeHref);
      }
    },
    [openApps, setOpenApps, currentApp, router, stateFor]
  );

  const value = useMemo<TabsContextValue>(
    () => ({
      currentApp,
      openApps,
      erp,
      os,
      maxTabs: MAX_TABS,
      capMessage,
      openTab,
      closeTab,
      openApp,
      closeApp,
      isSidebarOpen,
      toggleSidebar,
    }),
    [
      currentApp,
      openApps,
      erp,
      os,
      capMessage,
      openTab,
      closeTab,
      openApp,
      closeApp,
      isSidebarOpen,
      toggleSidebar,
    ]
  );

  return (
    <TabsContext.Provider value={value}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabsContext() {
  const context = useContext(TabsContext);

  if (context === undefined) {
    throw new Error(
      "useTabsContext deve ser usado dentro de um TabsProvider."
    );
  }

  return context;
}

/** Estado + ações das guias de um app específico. */
export function useTabs(app: AppKey) {
  const context = useTabsContext();
  const state = app === "erp" ? context.erp : context.os;

  return {
    ...state,
    homeHref: HOME_TAB[app].href,
    maxTabs: context.maxTabs,
    capMessage: context.capMessage,
    openTab: (entry: TabEntry) => context.openTab(app, entry),
    closeTab: (href: string) => context.closeTab(app, href),
  };
}

/** Estado aberto/fechado da Sidebar do ERP — sobrevive à navegação entre páginas. */
export function useSidebar() {
  const context = useTabsContext();

  return {
    isOpen: context.isSidebarOpen,
    toggle: context.toggleSidebar,
  };
}
