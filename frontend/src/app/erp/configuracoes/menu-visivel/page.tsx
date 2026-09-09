"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeOff, Loader2 } from "lucide-react";

import { OsShell } from "@/components";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { menu } from "@/components/layout/Sidebar/menu";
import { isMenuGroup } from "@/components/layout/Sidebar/Sidebar.types";
import { useAuth } from "@/providers/AuthProvider";
import { companyService } from "@/services/company.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

interface MenuRow {
  id: string;
  title: string;
  isGroup: boolean;
  parentTitle?: string;
}

/**
 * "Visão geral" (Home) nunca aparece aqui — é a página que abre
 * sozinha ao entrar no sistema, não faz sentido deixar escondível.
 */
const HOME_ID = "visao-geral";

/** Achata `menu.ts` (grupos + itens soltos) numa lista pra exibir em tabela. */
function buildRows(): MenuRow[] {
  const rows: MenuRow[] = [];

  for (const entry of menu) {
    if (entry.id === HOME_ID) {
      continue;
    }

    if (isMenuGroup(entry)) {
      rows.push({ id: entry.id, title: entry.title, isGroup: true });

      for (const child of entry.children) {
        rows.push({
          id: child.id,
          title: child.title,
          isGroup: false,
          parentTitle: entry.title,
        });
      }
    } else {
      rows.push({ id: entry.id, title: entry.title, isGroup: false });
    }
  }

  return rows;
}

export default function MenuVisivelPage() {
  const { user, refreshUser } = useAuth();
  const rows = useMemo(buildRows, []);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHidden(new Set(user?.company.hiddenMenuItemIds ?? []));
  }, [user?.company.hiddenMenuItemIds]);

  function toggle(id: string) {
    setSaved(false);
    setHidden((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await companyService.updateMine({
        hiddenMenuItemIds: [...hidden],
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível salvar as alterações.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <OsShell workspaceLabel="Menu visível">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Menu visível
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
                  Marque "Ocultar" pra reduzir o menu lateral quando
                  achar que tem opção demais — ninguém perde acesso: a
                  tela continua existindo, só some da navegação. Vale
                  pra todo mundo da empresa, em qualquer perfil.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Salvar
              </button>
            </header>

            {saved && (
              <div className="rounded-xl border border-[var(--success)] bg-[var(--success-soft)] p-3 text-sm text-[var(--success)]">
                Alterações salvas.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Item do menu</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Ocultar
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--border)]"
                >
                  <td
                    className={`px-4 py-2.5 ${
                      row.isGroup
                        ? "font-semibold text-[var(--text-primary)]"
                        : "pl-8 text-[var(--text-secondary)]"
                    }`}
                  >
                    {row.title}
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    <label className="inline-flex cursor-pointer items-center gap-2 justify-end">
                      {hidden.has(row.id) && (
                        <EyeOff
                          size={14}
                          className="text-[var(--text-muted)]"
                        />
                      )}

                      <input
                        type="checkbox"
                        checked={hidden.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListPageLayout>
    </OsShell>
  );
}
