import type { ReactNode } from "react";

interface ListPageLayoutProps {
  /** Título, ações, busca e filtros — nunca rola. */
  header: ReactNode;

  /**
   * Conteúdo da listagem (tabela, estados de carregando/vazio). Fica
   * num painel com rolagem própria, isolada do cabeçalho.
   */
  children: ReactNode;
}

/**
 * Padrão de tela de listagem: cabeçalho fixo em cima, resultados
 * rolando por baixo num painel separado (com seu próprio card
 * arredondado). Evita usar `position: sticky` diretamente sobre o
 * container que já tem `overflow-auto` + `rounded-*` (AppShell.main
 * já foi ajustado, mas replicar isso aqui de novo é frágil em
 * diferentes navegadores) — aqui a rolagem fica isolada num filho
 * próprio, então o cabeçalho da página nunca é sobreposto.
 */
export function ListPageLayout({
  header,
  children,
}: ListPageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-6 pb-6">{header}</div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border)]">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
