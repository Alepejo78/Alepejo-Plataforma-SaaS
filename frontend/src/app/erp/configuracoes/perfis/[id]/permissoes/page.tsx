"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { OsShell } from "@/components";

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
  { key: "delete", label: "Excluir" },
  { key: "view", label: "Consultar" },
];

// Colunas de ação de negócio: casam por código exato (ou lista de
// códigos, tratados juntos). Só aparecem clicáveis no(s) grupo(s) que
// realmente tiverem essa permissão no catálogo.
const BUSINESS_COLUMNS: {
  key: string;
  label: string;
  codes: string[];
}[] = [
  { key: "purchaseApprove", label: "Aprovador Compras", codes: ["purchase.approve"] },
  { key: "saleApprove", label: "Aprovador vendas", codes: ["sale.approve"] },
  { key: "inventoryEntryExit", label: "Entrada e saída Estoque", codes: ["inventory.entry", "inventory.exit"] },
  { key: "productionComplete", label: "Concluir produção", codes: ["production-order.complete"] },
  { key: "inventoryAdjust", label: "Ajustes de estoque", codes: ["inventory.adjust"] },
  { key: "timeEntryAdjust", label: "Ajuste Horas", codes: ["time-entry.update"] },
  { key: "reverse", label: "Estornar documentos", codes: [] }, // resolvido por sufixo, ver abaixo
];

const ADMIN_PERMISSION_CODE = "system.admin";

// Permissões que já cobrem "estornar" na prática, mas não seguem o
// sufixo ".reverse" (ex.: reabrir título baixado usa a mesma
// permissão de baixar, financial-entry.settle).
const REVERSE_EQUIVALENT_CODES = ["financial-entry.settle"];

interface GroupRow {
  groupId: string;
  groupName: string;
  permissions: Permission[];
}

export default function ConfigurarPerfilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roleId = params.id;

  const [role, setRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<Map<string, string>>(
    new Map()
  ); // permissionId -> rolePermissionId

  const [pending, setPending] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

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

  const rows: GroupRow[] = useMemo(() => {
    const byGroup = new Map<string, GroupRow>();

    permissions.forEach((permission) => {
      const existing = byGroup.get(permission.groupId);

      if (existing) {
        existing.permissions.push(permission);
      } else {
        byGroup.set(permission.groupId, {
          groupId: permission.groupId,
          groupName: permission.group.name,
          permissions: [permission],
        });
      }
    });

    return Array.from(byGroup.values())
      .filter((row) =>
        row.groupName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [permissions, search]);

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

  function renderCell(
    key: string,
    permission: Permission | Permission[] | null
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
    const checked = ids.every((id) => grants.has(id));
    const isPending = ids.some((id) => pending.has(id));

    return (
      <td
        key={key}
        className="border-t border-[var(--border)] px-2 py-2 text-center"
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={() => void toggle(ids)}
        />
      </td>
    );
  }

  return (
    <OsShell workspaceLabel="Configurar perfil">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
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
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
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
                {rows.map((row) => {
                  const rowIds = getRowPermissionIds(row);
                  const rowChecked =
                    rowIds.length > 0 &&
                    rowIds.every((id) => grants.has(id));
                  const rowPending = rowIds.some((id) =>
                    pending.has(id)
                  );

                  return (
                  <tr key={row.groupId}>
                    <td className="border-t border-[var(--border)] px-4 py-2 font-medium text-[var(--text-primary)]">
                      {row.groupName}
                    </td>

                    <td className="border-t border-[var(--border)] px-2 py-2 text-center">
                      {rowIds.length > 0 && (
                        <input
                          type="checkbox"
                          checked={rowChecked}
                          disabled={rowPending}
                          title="Marcar/desmarcar todas as caixas desta linha"
                          onChange={() => void toggle(rowIds)}
                        />
                      )}
                    </td>

                    {GENERIC_COLUMNS.map((column) =>
                      renderCell(
                        column.key,
                        findBySuffix(row, column.key)
                      )
                    )}

                    {BUSINESS_COLUMNS.map((column) => {
                      if (column.key === "reverse") {
                        return renderCell(
                          column.key,
                          findReverse(row)
                        );
                      }

                      if (column.codes.length > 1) {
                        return renderCell(
                          column.key,
                          findByCodes(row, column.codes)
                        );
                      }

                      const match =
                        row.permissions.find(
                          (p) => p.code === column.codes[0]
                        ) ?? null;

                      return renderCell(column.key, match);
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </OsShell>
  );
}
