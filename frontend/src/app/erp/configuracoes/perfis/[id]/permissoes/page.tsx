"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { OsShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
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
  { key: "payrollGenerate", label: "Gerar Folha", codes: ["payroll.generate"] },
  { key: "payrollConfirmItem", label: "Confirmar Recebimento de Holerite", codes: ["payroll.confirm-item"] },
  { key: "thirteenthSalaryGenerate", label: "Gerar 13º Salário", codes: ["thirteenth-salary.generate"] },
  { key: "timeClockApiKey", label: "Chave API Ponto", codes: ["time-clock.manage-api-key"] },
  { key: "licenseTrial", label: "Iniciar Teste Grátis", codes: ["license.trial"] },
  { key: "licenseCatalog", label: "Ver Catálogo de Planos", codes: ["license.catalog.view"] },
  { key: "userActivate", label: "Ativar Usuários", codes: ["user.activate"] },
  { key: "userDeactivate", label: "Desativar Usuários", codes: ["user.deactivate"] },
  { key: "userBlock", label: "Bloquear Usuários", codes: ["user.block"] },
  { key: "userUnblock", label: "Desbloquear Usuários", codes: ["user.unblock"] },
  { key: "userResetPassword", label: "Redefinir Senha", codes: ["user.reset-password"] },
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
  BUDGET: "FINANCE",
  CHART_OF_ACCOUNT: "FINANCE",
  CHART_OF_ACCOUNT_CLASSIFICATION: "FINANCE",
  QUOTE: "SALES",
  SALES_ORDER: "SALES",
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
  COMPANY_BRANDING: "BRANDING",
};

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

  const rows: GroupRow[] = useMemo(() => {
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
      .filter((row) =>
        row.groupName.toLowerCase().includes(search.toLowerCase())
      )
      .filter((row) => showLocked || !isLocked(row))
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, search, showLocked, hasModule]);

  const appRows = useMemo(
    () => rows.filter((row) => scopeOf(row) === "APP"),
    [rows]
  );

  const erpRows = useMemo(
    () => rows.filter((row) => scopeOf(row) === "ERP"),
    [rows]
  );

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

  const totalColumns =
    2 + GENERIC_COLUMNS.length + BUSINESS_COLUMNS.length;

  function renderGroupRow(row: GroupRow) {
    const locked = isLocked(row);

    const rowIds = getRowPermissionIds(row);
    const rowChecked =
      !locked && rowIds.length > 0 && rowIds.every((id) => grants.has(id));
    const rowPending = rowIds.some((id) => pending.has(id));

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
                    {appRows.map(renderGroupRow)}
                  </>
                )}

                {erpRows.length > 0 && (
                  <>
                    {renderSectionHeader("ERP")}
                    {erpRows.map(renderGroupRow)}
                  </>
                )}
              </tbody>
          </table>
        )}
      </ListPageLayout>
    </OsShell>
  );
}
