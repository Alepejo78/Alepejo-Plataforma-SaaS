"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { OsShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { menu } from "@/components/layout/Sidebar/menu";
import { isMenuGroup } from "@/components/layout/Sidebar/Sidebar.types";
import { useAuth } from "@/providers/AuthProvider";
import { useShowLockedModules } from "@/providers/ShowLockedModulesProvider";

import { roleService, type Role } from "@/services/role.service";
import {
  permissionService,
  type Permission,
  type RolePermission,
} from "@/services/permission.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

// Colunas genéricas: casam com o sufixo do código da permissão dentro
// do grupo (ex.: "partner.view" -> sufixo "view").
const GENERIC_COLUMNS: { key: string; label: string }[] = [
  { key: "create", label: "Cadastrar" },
  { key: "import", label: "Importar" },
  { key: "export", label: "Exportar" },
  { key: "update", label: "Editar" },
  { key: "cancel", label: "Cancelar" },
  { key: "approve", label: "Aprovar" },
  { key: "delete", label: "Excluir" },
  { key: "manage", label: "Configurar" },
  { key: "view", label: "Consultar" },
  { key: "report", label: "Relatório" },
];

// Colunas de ação de negócio: casam por código exato (ou lista de
// códigos, tratados juntos). Só aparecem clicáveis no(s) grupo(s) que
// realmente tiverem essa permissão no catálogo.
const BUSINESS_COLUMNS: {
  key: string;
  label: string;
  codes: string[];
}[] = [
  { key: "inventoryEntryExit", label: "Entrada e saída Estoque", codes: ["inventory.entry", "inventory.exit"] },
  { key: "inventoryHold", label: "Reservar Estoque", codes: ["inventory.hold"] },
  { key: "inventoryReleaseHold", label: "Liberar Reserva Estoque", codes: ["inventory.release-hold"] },
  { key: "productionComplete", label: "Concluir produção", codes: ["production-order.complete"] },
  { key: "inventoryAdjust", label: "Ajustes de estoque", codes: ["inventory.adjust"] },
  { key: "timeEntryAdjust", label: "Ajuste Horas", codes: ["time-entry.update"] },
  { key: "purchaseReceive", label: "Receber Compras", codes: ["purchase.receive"] },
  { key: "quotationDecide", label: "Escolher Vencedor da Cotação", codes: ["quotation.decide"] },
  { key: "quoteSendConfirmation", label: "Enviar Orçamento para Aprovação do Cliente", codes: ["quote.send-confirmation"] },
  { key: "serviceOrderSendConfirmation", label: "Enviar Ordem de Serviço para Confirmação do Cliente", codes: ["service-order.send-confirmation"] },
  { key: "payrollGenerate", label: "Gerar Folha", codes: ["payroll.generate"] },
  { key: "payrollConfirmItem", label: "Confirmar Recebimento de Holerite", codes: ["payroll.confirm-item"] },
  { key: "thirteenthSalaryGenerate", label: "Gerar 13º Salário", codes: ["thirteenth-salary.generate"] },
  { key: "thirteenthSalaryConfirmItem", label: "Confirmar Recebimento de 13º", codes: ["thirteenth-salary.confirm-item"] },
  { key: "vacationConfirmItem", label: "Confirmar Recebimento de Férias", codes: ["vacation.confirm-item"] },
  { key: "salaryAdvanceConfirmItem", label: "Confirmar Recebimento de Adiantamento", codes: ["salary-advance.confirm-item"] },
  { key: "timeEntryConfirmItem", label: "Confirmar Recebimento de Ponto", codes: ["time-entry.confirm-item"] },
  { key: "timeClockApiKey", label: "Chave API Ponto", codes: ["time-clock.manage-api-key"] },
  { key: "licenseTrial", label: "Iniciar Teste Grátis", codes: ["license.trial"] },
  { key: "licenseCatalog", label: "Ver Catálogo de Planos", codes: ["license.catalog.view"] },
  { key: "userActivate", label: "Ativar Usuários", codes: ["user.activate"] },
  { key: "userDeactivate", label: "Desativar Usuários", codes: ["user.deactivate"] },
  { key: "userBlock", label: "Bloquear Usuários", codes: ["user.block"] },
  { key: "userUnblock", label: "Desbloquear Usuários", codes: ["user.unblock"] },
  { key: "userResetPassword", label: "Redefinir Senha", codes: ["user.reset-password"] },
  { key: "profilePersonal", label: "Minha Conta (Foto, Cor, Layout, Guias)", codes: ["profile.personal"] },
  { key: "reverse", label: "Estornar documentos", codes: [] }, // resolvido por sufixo, ver abaixo
];

const ADMIN_PERMISSION_CODE = "system.admin";

// Permissões que já cobrem "estornar" na prática, mas não seguem o
// sufixo ".reverse" — reaproveitam a permissão de uma ação vizinha em
// vez de ganhar uma própria (ex.: reabrir título baixado usa a mesma
// permissão de baixar, financial-entry.settle; estornar pedido de
// compra convertido usa purchase-order.cancel; estornar escolha de
// vencedora de cotação usa quotation.decide; estornar aprovação de
// orçamento usa quote.approve).
const REVERSE_EQUIVALENT_CODES = [
  "financial-entry.settle",
  "purchase-order.cancel",
  "quotation.decide",
  "quote.approve",
];

/**
 * Separa as linhas da matriz em duas seções — "APP" (administração/
 * integrações do app OS: Segurança, Empresa, Licenciamento,
 * Personalização, APIs, cadastros de apoio movidos pra
 * Configurações) e "ERP" (operação do dia a dia: Parceiros, Produtos,
 * Estoque, Compras, Vendas, Financeiro, RH, Produção). Só existe aqui
 * (não no banco) — é puramente visual, então grupo novo sem entrada
 * aqui cai em "ERP" por padrão (ver fallback em `scopeOf`).
 */
const GROUP_SCOPE: Record<string, "APP" | "ERP"> = {
  SYSTEM: "APP",
  COMPANY: "APP",
  USER: "APP",
  ROLE: "APP",
  PERMISSION: "APP",
  ROLE_PERMISSION: "APP",
  USER_ROLE: "APP",
  LICENSE: "APP",
  COMPANY_BRANDING: "APP",
  WHATSAPP: "APP",
  EMAIL: "APP",
  SCHEDULED_NOTIFICATIONS: "APP",
  PRODUCT_CATEGORY: "APP",
  BRAND: "APP",
  UNIT_OF_MEASURE: "APP",
  WAREHOUSE: "APP",
  CHART_OF_ACCOUNT: "APP",
  CHART_OF_ACCOUNT_CLASSIFICATION: "APP",
};

const SCOPE_LABEL: Record<"APP" | "ERP", string> = {
  APP: "APP — Administração e integrações",
  ERP: "ERP — Operação do dia a dia",
};

/**
 * Grupo de permissão -> módulo licenciado exigido pra poder MARCAR
 * (não só ver) essas permissões num perfil. Grupos fora deste mapa
 * (SYSTEM, COMPANY, USER, ROLE, PERMISSION, LICENSE, WHATSAPP, EMAIL,
 * CRM, cadastros de apoio...) não dependem de módulo — sempre
 * marcáveis, igual já era antes.
 *
 * Vários grupos de permissão caem no mesmo módulo (ex.: PARTNER,
 * CLIENT e SUPPLIER são todos BPS) — os grupos não batem 1:1 com os
 * módulos vendáveis, então o mapa é manual em vez de derivado do
 * código do grupo.
 */
const GROUP_MODULE: Record<string, string> = {
  PARTNER: "BPS",
  CLIENT: "BPS",
  SUPPLIER: "BPS",
  PRODUCT: "PRODUCTS",
  PRODUCT_CATEGORY: "PRODUCTS",
  BRAND: "PRODUCTS",
  UNIT_OF_MEASURE: "PRODUCTS",
  INVENTORY: "INVENTORY",
  STOCK_MOVEMENT: "INVENTORY",
  WAREHOUSE: "INVENTORY",
  PURCHASE: "PURCHASE",
  SALES: "SALES",
  FINANCIAL: "FINANCE",
  FINANCIAL_ENTRY: "FINANCE",
  PAYMENT_REMINDER_SETTINGS: "FINANCE",
  PAYMENT_METHOD_SETTINGS: "FINANCE",
  BUDGET: "FINANCE",
  CHART_OF_ACCOUNT: "FINANCE",
  CHART_OF_ACCOUNT_CLASSIFICATION: "FINANCE",
  QUOTE: "SALES",
  SALES_ORDER: "SALES",
  SERVICE_ORDER: "SALES",
  QUOTATION: "PURCHASE",
  PURCHASE_ORDER: "PURCHASE",
  PRODUCTION: "PRODUCTION",
  PRODUCTION_SETTINGS: "PRODUCTION",
  TIME_ENTRY: "LABOR",
  ABSENCE_RECORD: "LABOR",
  SECTOR: "HR",
  WORK_SCHEDULE: "HR",
  PPE_TYPE: "HR",
  JOB_FUNCTION: "HR",
  EMPLOYEE: "HR",
  PPE_DELIVERY: "HR",
  BENEFIT: "HR",
  PAYROLL_TAX_TABLE: "LABOR",
  PAYROLL_SETTINGS: "LABOR",
  PAYROLL: "LABOR",
  THIRTEENTH_SALARY: "LABOR",
  VACATION: "LABOR",
  SALARY_ADVANCE: "LABOR",
  INVENTORY_COUNT: "INVENTORY_COUNT",
  INVENTORY_COUNT_TRACKING: "INVENTORY_COUNT",
  SALES_SETTINGS: "SALES",
  COMPANY_BRANDING: "BRANDING",
};

/**
 * Grupo de permissão -> bloco visual dentro da seção APP/ERP — só pra
 * organizar a tabela (agrupar linhas do mesmo assunto, ex.: Compras +
 * Cotações + Pedidos de Compra debaixo de "Compras"), não tem relação
 * com licenciamento. Grupo sem entrada aqui vira um bloco sozinho com
 * o próprio nome (fallback em `blockOf`), então nada some da tabela
 * por falta de mapeamento — só fica sem agrupar com mais ninguém.
 */
const GROUP_BLOCK: Record<string, string> = {
  USER: "Segurança",
  ROLE: "Segurança",
  PERMISSION: "Segurança",
  ROLE_PERMISSION: "Segurança",
  USER_ROLE: "Segurança",

  COMPANY: "Empresa",
  LICENSE: "Licenciamento",
  COMPANY_BRANDING: "Personalização",

  WHATSAPP: "Comunicação",
  EMAIL: "Comunicação",
  SCHEDULED_NOTIFICATIONS: "Comunicação",

  SYSTEM: "Sistema",

  PRODUCT_CATEGORY: "Cadastros de apoio",
  BRAND: "Cadastros de apoio",
  UNIT_OF_MEASURE: "Cadastros de apoio",
  WAREHOUSE: "Cadastros de apoio",
  CHART_OF_ACCOUNT: "Cadastros de apoio",
  CHART_OF_ACCOUNT_CLASSIFICATION: "Cadastros de apoio",
  SECTOR: "Cadastros de apoio",
  WORK_SCHEDULE: "Cadastros de apoio",
  PPE_TYPE: "Cadastros de apoio",
  JOB_FUNCTION: "Cadastros de apoio",

  PARTNER: "Parceiros",
  PRODUCT: "Produtos",

  INVENTORY: "Estoque",
  STOCK_MOVEMENT: "Estoque",
  INVENTORY_COUNT: "Estoque",
  INVENTORY_COUNT_TRACKING: "Estoque",

  PURCHASE: "Compras",
  QUOTATION: "Compras",
  PURCHASE_ORDER: "Compras",

  SALES: "Vendas",
  QUOTE: "Vendas",
  SALES_ORDER: "Vendas",
  SERVICE_ORDER: "Vendas",
  SALES_SETTINGS: "Vendas",
  CRM: "Vendas",

  FINANCIAL: "Financeiro",
  FINANCIAL_ENTRY: "Financeiro",
  PAYMENT_REMINDER_SETTINGS: "Financeiro",
  PAYMENT_METHOD_SETTINGS: "Financeiro",
  BUDGET: "Financeiro",
  BANK_ACCOUNT: "Financeiro",

  EMPLOYEE: "Recursos Humanos",
  PPE_DELIVERY: "Recursos Humanos",
  BENEFIT: "Recursos Humanos",

  PAYROLL: "Folha e encargos",
  PAYROLL_SETTINGS: "Folha e encargos",
  PAYROLL_TAX_TABLE: "Folha e encargos",
  THIRTEENTH_SALARY: "Folha e encargos",
  VACATION: "Folha e encargos",
  SALARY_ADVANCE: "Folha e encargos",

  TIME_ENTRY: "Ponto",
  ABSENCE_RECORD: "Ponto",

  PRODUCTION: "Produção",
  PRODUCTION_SETTINGS: "Produção",
};

/** Ordem de exibição dos blocos — os que não estiverem aqui vão pro fim, em ordem alfabética. */
const BLOCK_ORDER = [
  "Segurança",
  "Empresa",
  "Licenciamento",
  "Personalização",
  "Comunicação",
  "Cadastros de apoio",
  "Sistema",
  "Parceiros",
  "Produtos",
  "Estoque",
  "Compras",
  "Vendas",
  "Financeiro",
  "Recursos Humanos",
  "Folha e encargos",
  "Ponto",
  "Produção",
];

interface GroupRow {
  groupId: string;
  groupCode: string;
  groupName: string;
  permissions: Permission[];
}

function scopeOf(row: GroupRow): "APP" | "ERP" {
  return GROUP_SCOPE[row.groupCode] ?? "ERP";
}

function moduleOf(row: GroupRow): string | null {
  return GROUP_MODULE[row.groupCode] ?? null;
}

function blockOf(row: GroupRow): string {
  return GROUP_BLOCK[row.groupCode] ?? row.groupName;
}

interface Block {
  name: string;
  rows: GroupRow[];
}

/** Agrupa linhas já filtradas/ordenadas em blocos, na ordem de `BLOCK_ORDER` (resto em ordem alfabética no fim). */
function groupIntoBlocks(sectionRows: GroupRow[]): Block[] {
  const map = new Map<string, GroupRow[]>();

  for (const row of sectionRows) {
    const block = blockOf(row);
    const list = map.get(block);

    if (list) {
      list.push(row);
    } else {
      map.set(block, [row]);
    }
  }

  return Array.from(map.entries())
    .map(([name, rows]) => ({ name, rows }))
    .sort((a, b) => {
      const ia = BLOCK_ORDER.indexOf(a.name);
      const ib = BLOCK_ORDER.indexOf(b.name);

      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
      if (ia === -1) return 1;
      if (ib === -1) return -1;

      return ia - ib;
    });
}

/**
 * "Visão geral" (Home) nunca entra aqui — é a página que abre sozinha
 * ao entrar no sistema, não faz sentido deixar escondível.
 */
const HOME_MENU_ID = "visao-geral";

interface FlatMenuItem {
  id: string;
  title: string;
  permission?: string | string[];
}

/** Achata `menu.ts` (grupos + itens soltos) numa lista só, carregando a permissão de cada um — é por ela que cada item se liga a uma linha da matriz abaixo. */
function flattenMenu(): FlatMenuItem[] {
  const items: FlatMenuItem[] = [];

  for (const entry of menu) {
    if (entry.id === HOME_MENU_ID) {
      continue;
    }

    items.push({ id: entry.id, title: entry.title, permission: entry.permission });

    if (isMenuGroup(entry)) {
      for (const child of entry.children) {
        items.push({
          id: child.id,
          title: child.title,
          permission: child.permission,
        });
      }
    }
  }

  return items;
}

const FLAT_MENU_ITEMS = flattenMenu();

/**
 * Item(ns) de menu que esta linha da matriz controla — cruza pelo
 * código da permissão (`row.permissions[].code` contra
 * `item.permission`), não por nome, então continua certo mesmo se o
 * grupo mudar de nome. Uma linha pode não corresponder a nenhum item
 * (grupo só de administração, sem entrada na sidebar) ou a mais de um
 * (ex.: "Contas a pagar/receber" usa a mesma permissão em 3 telas) —
 * nesse caso a coluna "Ocultar" esconde as telas todas juntas.
 */
function menuItemsForRow(row: GroupRow): FlatMenuItem[] {
  const codes = new Set(row.permissions.map((p) => p.code));

  return FLAT_MENU_ITEMS.filter((item) => {
    if (!item.permission) {
      return false;
    }

    const perms = Array.isArray(item.permission)
      ? item.permission
      : [item.permission];

    return perms.some((code) => codes.has(code));
  });
}

export default function ConfigurarPerfilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roleId = params.id;
  const { hasModule } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<Map<string, string>>(
    new Map()
  ); // permissionId -> rolePermissionId

  const [pending, setPending] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showLocked, setShowLocked] = useShowLockedModules();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hiddenMenuItems, setHiddenMenuItems] = useState<Set<string>>(
    new Set()
  );
  const [menuItemSaving, setMenuItemSaving] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [roleData, allPermissions, roleGrants] =
        await Promise.all([
          roleService.getById(roleId),
          permissionService.listAll(),
          permissionService.listByRole(roleId),
        ]);

      setRole(roleData);
      setRoleName(roleData.name);
      setPermissions(allPermissions);
      setHiddenMenuItems(new Set(roleData.hiddenMenuItemIds));

      const map = new Map<string, string>();

      roleGrants.forEach((rolePermission: RolePermission) => {
        map.set(rolePermission.permissionId, rolePermission.id);
      });

      setGrants(map);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível carregar o perfil.")
      );
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    void load();
  }, [load]);

  function isLocked(row: GroupRow) {
    const requiredModule = moduleOf(row);
    return Boolean(requiredModule && !hasModule(requiredModule));
  }

  const baseRows: GroupRow[] = useMemo(() => {
    const byGroup = new Map<string, GroupRow>();

    permissions.forEach((permission) => {
      const existing = byGroup.get(permission.groupId);

      if (existing) {
        existing.permissions.push(permission);
      } else {
        byGroup.set(permission.groupId, {
          groupId: permission.groupId,
          groupCode: permission.group.code,
          groupName: permission.group.name,
          permissions: [permission],
        });
      }
    });

    return Array.from(byGroup.values())
      .filter((row) => showLocked || !isLocked(row))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, showLocked, hasModule]);

  // Busca acha o BLOCO inteiro (ex.: digitar "compras" traz Compras +
  // Cotações + Pedidos de Compra juntos), não só a linha cujo nome
  // bate — mais fácil de achar tudo de um assunto sem lembrar o nome
  // exato de cada linha.
  const rows: GroupRow[] = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return baseRows;
    }

    const matchingBlocks = new Set(
      baseRows
        .filter(
          (row) =>
            row.groupName.toLowerCase().includes(term) ||
            blockOf(row).toLowerCase().includes(term)
        )
        .map((row) => blockOf(row))
    );

    return baseRows.filter((row) => matchingBlocks.has(blockOf(row)));
  }, [baseRows, search]);

  const appRows = useMemo(
    () => rows.filter((row) => scopeOf(row) === "APP"),
    [rows]
  );

  const erpRows = useMemo(
    () => rows.filter((row) => scopeOf(row) === "ERP"),
    [rows]
  );

  const appBlocks = useMemo(() => groupIntoBlocks(appRows), [appRows]);
  const erpBlocks = useMemo(() => groupIntoBlocks(erpRows), [erpRows]);

  const adminPermission = useMemo(
    () =>
      permissions.find((p) => p.code === ADMIN_PERMISSION_CODE) ??
      null,
    [permissions]
  );

  function findBySuffix(row: GroupRow, suffix: string) {
    return (
      row.permissions.find((p) => p.code.endsWith(`.${suffix}`)) ??
      null
    );
  }

  function findByCodes(row: GroupRow, codes: string[]) {
    const matches = row.permissions.filter((p) =>
      codes.includes(p.code)
    );

    return matches.length === codes.length ? matches : [];
  }

  function findReverse(row: GroupRow) {
    const match = row.permissions.filter(
      (p) =>
        p.code.endsWith(".reverse") ||
        REVERSE_EQUIVALENT_CODES.includes(p.code)
    );

    return match;
  }

  // Concede só o que falta e revoga só o que já está concedido —
  // importante pro "marcar tudo da linha", que mistura permissões já
  // concedidas com outras ainda não (chamar grant numa já concedida
  // dá erro "já vinculada").
  async function toggle(permissionIds: string[]) {
    if (permissionIds.length === 0) {
      return;
    }

    const missingIds = permissionIds.filter((id) => !grants.has(id));
    const grantedIds = permissionIds.filter((id) => grants.has(id));
    const allGranted = missingIds.length === 0;

    setPending((previous) => {
      const next = new Set(previous);
      permissionIds.forEach((id) => next.add(id));
      return next;
    });

    setError("");

    try {
      if (allGranted) {
        await Promise.all(
          grantedIds.map((id) => {
            const rolePermissionId = grants.get(id);
            return rolePermissionId
              ? permissionService.revoke(rolePermissionId)
              : Promise.resolve();
          })
        );

        setGrants((previous) => {
          const next = new Map(previous);
          grantedIds.forEach((id) => next.delete(id));
          return next;
        });
      } else {
        const results = await Promise.all(
          missingIds.map((id) =>
            permissionService.grant(roleId, id)
          )
        );

        setGrants((previous) => {
          const next = new Map(previous);
          results.forEach((rp) => next.set(rp.permissionId, rp.id));
          return next;
        });
      }
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível alterar a permissão.")
      );
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        permissionIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  // Junta os ids de permissão de todas as células reais da linha
  // (as que aparecem como checkbox, não as "—") — usado pelo
  // "Marcar tudo".
  function getRowPermissionIds(row: GroupRow): string[] {
    const ids = new Set<string>();

    GENERIC_COLUMNS.forEach((column) => {
      const match = findBySuffix(row, column.key);
      if (match) {
        ids.add(match.id);
      }
    });

    BUSINESS_COLUMNS.forEach((column) => {
      const list =
        column.key === "reverse"
          ? findReverse(row)
          : column.codes.length > 1
            ? findByCodes(row, column.codes)
            : (() => {
                const match = row.permissions.find(
                  (p) => p.code === column.codes[0]
                );
                return match ? [match] : [];
              })();

      list.forEach((p) => ids.add(p.id));
    });

    return Array.from(ids);
  }

  async function handleRenameBlur() {
    const trimmed = roleName.trim();

    if (!role || !trimmed || trimmed === role.name) {
      return;
    }

    try {
      const updated = await roleService.update(roleId, {
        name: trimmed,
      });

      setRole(updated);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível renomear o perfil.")
      );
      setRoleName(role.name);
    }
  }

  // Semântica invertida de propósito: o checkbox representa "Visível"
  // (marcado = aparece no menu), não "Ocultar" — assim uma linha cujas
  // permissões acabaram de ser todas concedidas por "Marcar tudo" já
  // aparece com a caixa de visibilidade também marcada (comportamento
  // padrão é visível), em vez de parecer que "marcar tudo" esqueceu
  // essa coluna.
  async function toggleMenuItemsVisible(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const previous = hiddenMenuItems;
    const allVisible = ids.every((id) => !previous.has(id));
    const next = new Set(previous);

    if (allVisible) {
      ids.forEach((id) => next.add(id));
    } else {
      ids.forEach((id) => next.delete(id));
    }

    setHiddenMenuItems(next);
    setMenuItemSaving(ids.join(","));
    setError("");

    try {
      const updated = await roleService.update(roleId, {
        hiddenMenuItemIds: [...next],
      });

      setRole(updated);
    } catch (err) {
      setHiddenMenuItems(previous);
      setError(
        extractMessage(
          err,
          "Não foi possível salvar o menu deste perfil."
        )
      );
    } finally {
      setMenuItemSaving(null);
    }
  }

  const totalColumns =
    3 + GENERIC_COLUMNS.length + BUSINESS_COLUMNS.length;

  function renderGroupRow(row: GroupRow) {
    const locked = isLocked(row);

    const rowIds = getRowPermissionIds(row);
    const rowChecked =
      !locked && rowIds.length > 0 && rowIds.every((id) => grants.has(id));
    const rowPending = rowIds.some((id) => pending.has(id));

    const menuIds = menuItemsForRow(row).map((item) => item.id);
    const menuVisible =
      menuIds.length > 0 && menuIds.every((id) => !hiddenMenuItems.has(id));

    return (
      <tr key={row.groupId} className={locked ? "opacity-60" : undefined}>
        <td className="sticky left-0 z-[5] border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-medium text-[var(--text-primary)]">
          <span className="flex items-center gap-1.5">
            {row.groupName}
            {locked && (
              <Lock
                size={12}
                className="shrink-0 text-[var(--text-muted)]"
                aria-label="Módulo não licenciado"
              />
            )}
          </span>
        </td>

        <td className="border-t border-[var(--border)] px-2 py-2 text-center">
          {rowIds.length > 0 && (
            <input
              type="checkbox"
              checked={rowChecked}
              disabled={rowPending || locked}
              title={
                locked
                  ? "Módulo não licenciado — adquira em Licenciamento para liberar"
                  : "Marcar/desmarcar todas as caixas desta linha"
              }
              onChange={() => void toggle(rowIds)}
            />
          )}
        </td>

        <td className="border-t border-[var(--border)] px-2 py-2 text-center">
          {menuIds.length > 0 && (
            <input
              type="checkbox"
              checked={menuVisible}
              disabled={locked || menuItemSaving === menuIds.join(",")}
              onChange={() => void toggleMenuItemsVisible(menuIds)}
            />
          )}
          {menuIds.length === 0 && (
            <span className="text-[var(--text-muted)]">—</span>
          )}
        </td>

        {GENERIC_COLUMNS.map((column) =>
          renderCell(column.key, findBySuffix(row, column.key), locked)
        )}

        {BUSINESS_COLUMNS.map((column) => {
          if (column.key === "reverse") {
            return renderCell(column.key, findReverse(row), locked);
          }

          if (column.codes.length > 1) {
            return renderCell(
              column.key,
              findByCodes(row, column.codes),
              locked
            );
          }

          const match =
            row.permissions.find(
              (p) => p.code === column.codes[0]
            ) ?? null;

          return renderCell(column.key, match, locked);
        })}
      </tr>
    );
  }

  function renderSectionHeader(scope: "APP" | "ERP") {
    return (
      <tr key={`section-${scope}`}>
        <td
          colSpan={totalColumns}
          className="border-t border-[var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
        >
          {SCOPE_LABEL[scope]}
        </td>
      </tr>
    );
  }

  function renderBlockHeader(scope: "APP" | "ERP", block: Block) {
    // União das permissões de TODAS as linhas do bloco (só as
    // desbloqueadas — módulo travado não entra na conta) — mesma ideia
    // do "Marcar tudo" por linha, só que pro bloco inteiro.
    const ids = new Set<string>();

    block.rows.forEach((row) => {
      if (isLocked(row)) return;
      getRowPermissionIds(row).forEach((id) => ids.add(id));
    });

    const blockIds = Array.from(ids);
    const allChecked =
      blockIds.length > 0 && blockIds.every((id) => grants.has(id));
    const isPending = blockIds.some((id) => pending.has(id));

    return (
      <tr key={`block-${scope}-${block.name}`}>
        <td
          colSpan={totalColumns}
          className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2"
        >
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            {blockIds.length > 0 && (
              <input
                type="checkbox"
                checked={allChecked}
                disabled={isPending}
                title="Marcar/desmarcar todas as caixas deste bloco"
                onChange={() => void toggle(blockIds)}
              />
            )}
            {block.name}
          </label>
        </td>
      </tr>
    );
  }

  function renderCell(
    key: string,
    permission: Permission | Permission[] | null,
    locked: boolean
  ) {
    const list = Array.isArray(permission)
      ? permission
      : permission
        ? [permission]
        : [];

    if (list.length === 0) {
      return (
        <td
          key={key}
          className="border-t border-[var(--border)] px-2 py-2 text-center text-[var(--text-muted)]"
        >
          —
        </td>
      );
    }

    const ids = list.map((p) => p.id);
    const isPending = ids.some((id) => pending.has(id));

    // Módulo não licenciado: sempre desmarcado e sem opção de marcar,
    // mesmo que o perfil já tivesse essa permissão concedida antes de
    // perder a licença (o vínculo continua existindo no banco — quem
    // bloqueia de verdade é o LicenseGuard — só a marcação some daqui).
    const checked = !locked && ids.every((id) => grants.has(id));

    return (
      <td
        key={key}
        className="border-t border-[var(--border)] px-2 py-2 text-center"
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending || locked}
          title={
            locked
              ? "Módulo não licenciado — adquira em Licenciamento para liberar"
              : undefined
          }
          onChange={() => void toggle(ids)}
        />
      </td>
    );
  }

  return (
    <OsShell workspaceLabel="Configurar perfil">
      <ListPageLayout
        header={
          <>
            <button
              type="button"
              onClick={() => router.push("/erp/configuracoes/perfis")}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Voltar para Perfis
            </button>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-md flex-1">
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Nome do Perfil
                </label>

                <input
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  onBlur={() => void handleRenameBlur()}
                />
              </div>

              {adminPermission && (
                <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={grants.has(adminPermission.id)}
                    disabled={pending.has(adminPermission.id)}
                    onChange={() =>
                      void toggle([adminPermission.id])
                    }
                  />
                  Administração Geral
                </label>
              )}

              <div className="w-full max-w-xs">
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Filtros
                </label>

                <input
                  placeholder="Buscar módulo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                />
              </div>

              <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={showLocked}
                  onChange={(e) => setShowLocked(e.target.checked)}
                />
                Mostrar módulos bloqueados
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="sticky left-0 z-20 bg-[var(--surface-hover)] px-4 py-3 font-semibold">
                    Módulo
                  </th>

                  <th className="px-2 py-3 text-center font-semibold">
                    Marcar tudo
                  </th>

                  <th className="px-2 py-3 text-center font-semibold">
                    Visível
                  </th>

                  {GENERIC_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-2 py-3 text-center font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}

                  {BUSINESS_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="px-2 py-3 text-center font-semibold"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {appRows.length > 0 && (
                  <>
                    {renderSectionHeader("APP")}
                    {appBlocks.map((block) => (
                      <Fragment key={block.name}>
                        {renderBlockHeader("APP", block)}
                        {block.rows.map(renderGroupRow)}
                      </Fragment>
                    ))}
                  </>
                )}

                {erpRows.length > 0 && (
                  <>
                    {renderSectionHeader("ERP")}
                    {erpBlocks.map((block) => (
                      <Fragment key={block.name}>
                        {renderBlockHeader("ERP", block)}
                        {block.rows.map(renderGroupRow)}
                      </Fragment>
                    ))}
                  </>
                )}
              </tbody>
          </table>
        )}
      </ListPageLayout>
    </OsShell>
  );
}
