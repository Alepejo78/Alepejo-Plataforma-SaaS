import { ReactNode } from "react";

export interface AppShellProps {
  children: ReactNode;

  /** Rótulo exibido no TopBar (ex.: "Vendas", "Visão geral"). */
  workspaceLabel?: string;
}
