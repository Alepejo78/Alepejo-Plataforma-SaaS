import { ReactNode } from "react";

export interface OsShellProps {
  children: ReactNode;

  /** Rótulo exibido no TopBar (ex.: "Segurança", "APIs"). */
  workspaceLabel?: string;
}
