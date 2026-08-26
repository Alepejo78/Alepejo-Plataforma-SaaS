import { LucideIcon } from "lucide-react";

/**
 * Item de menu (folha): navega para uma rota.
 */
export interface MenuItem {
  id: string;
  title: string;
  icon?: LucideIcon;
  href: string;

  /**
   * Animação específica do ícone no hover/clique (CSS em globals.css,
   * seletores `svg[data-icon-anim="..."]`) — "users", "usercog",
   * "truck" ou "cart". Ausente = só a animação genérica (escala).
   */
  iconAnim?: string;

  /**
   * Código do módulo licenciado exigido para ver este item.
   * Deve bater com o `code` da tabela `modules` no backend
   * (BPS, PRODUCTS, INVENTORY, PURCHASE, SALES).
   * Ausente = item não depende de licença.
   */
  module?: string;

  /**
   * Permissão exigida (RBAC). Ausente = não exige permissão específica.
   */
  permission?: string;

  /**
   * Item ainda não implementado: aparece desabilitado em vez de
   * navegar para lugar nenhum.
   */
  disabled?: boolean;

  /**
   * Bloco da sidebar (frente "Interprise"): "interprise" = cadastro
   * compartilhado por todas as empresas do grupo (Parceiros, Produtos,
   * Colaboradores, cadastros de apoio). Ausente = "empresa" (padrão,
   * tudo que já existia antes).
   */
  section?: "interprise" | "empresa";

  /**
   * Calculado em tempo de execução por `useMenu` (não faz parte da
   * definição estática em `menu.ts`) — `module` exigido mas não
   * licenciado. Item continua aparecendo (diferente de `disabled`),
   * só que sem navegar: leva pra Licenciamento com uma chamada pra
   * adquirir o módulo.
   */
  locked?: boolean;
}

/**
 * Grupo de menu: um módulo do ERP que abre submenu ao ser clicado.
 */
export interface MenuGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  iconAnim?: string;

  /** Mesmas regras de licença/permissão dos itens. */
  module?: string;
  permission?: string;

  /** Ver MenuItem.section — mesma regra, ausente = "empresa". */
  section?: "interprise" | "empresa";

  children: MenuItem[];
}

export type MenuEntry = MenuItem | MenuGroup;

export function isMenuGroup(
  entry: MenuEntry
): entry is MenuGroup {
  return (entry as MenuGroup).children !== undefined;
}
