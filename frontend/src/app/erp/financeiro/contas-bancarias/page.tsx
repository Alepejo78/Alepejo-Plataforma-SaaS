"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Landmark, Pencil, Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";

import {
  BANK_ACCOUNT_TYPE_LABELS,
  PIX_KEY_TYPE_LABELS,
  bankAccountService,
  type BankAccount,
  type BankAccountType,
  type PixKeyType,
} from "@/services/bank-account.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

interface FormState {
  description: string;
  bankName: string;
  agency: string;
  accountNumber: string;
  accountType: BankAccountType | "";
  pixKeyType: PixKeyType | "";
  pixKey: string;
}

function emptyForm(): FormState {
  return {
    description: "",
    bankName: "",
    agency: "",
    accountNumber: "",
    accountType: "",
    pixKeyType: "",
    pixKey: "",
  };
}

export default function ContasBancariasPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await bankAccountService.list();

      setAccounts(result);
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível carregar as contas bancárias.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(account: BankAccount) {
    setEditingId(account.id);
    setForm({
      description: account.description,
      bankName: account.bankName,
      agency: account.agency ?? "",
      accountNumber: account.accountNumber ?? "",
      accountType: account.accountType ?? "",
      pixKeyType: account.pixKeyType ?? "",
      pixKey: account.pixKey ?? "",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function save() {
    if (!form.description.trim() || !form.bankName.trim()) {
      setFormError("Preencha o apelido e o banco.");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload = {
        description: form.description.trim(),
        bankName: form.bankName.trim(),
        agency: form.agency.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        accountType: form.accountType || undefined,
        pixKeyType: form.pixKeyType || undefined,
        pixKey: form.pixKey.trim() || undefined,
      };

      if (editingId) {
        await bankAccountService.update(editingId, payload);
      } else {
        await bankAccountService.create(payload);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        extractMessage(err, "Não foi possível salvar a conta bancária.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(account: BankAccount) {
    if (
      !window.confirm(`Excluir a conta "${account.description}"?`)
    ) {
      return;
    }

    try {
      await bankAccountService.remove(account.id);
      await load();
    } catch (err) {
      setListError(
        extractMessage(err, "Não foi possível excluir a conta bancária.")
      );
    }
  }

  return (
    <AppShell workspaceLabel="Financeiro">
      <ListPageLayout
        header={
          <>
            <header>
              <Link
                href="/erp/financeiro/pagar"
                className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <ArrowLeft size={16} />
                Voltar para Financeiro
              </Link>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Contas Bancárias
                  </h1>

                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Cadastro das contas da empresa — só organização: ao
                    baixar um título, você escolhe de qual conta saiu ou
                    entrou o dinheiro. Não movimenta nada de verdade no
                    banco.
                  </p>
                </div>

                <Can permission="bank-account.create">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Nova conta
                  </button>
                </Can>
              </div>
            </header>

            {listError && (
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {listError}
              </div>
            )}
          </>
        }
      >
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center">
            <Landmark className="mx-auto mb-2 text-[var(--text-muted)]" size={32} />
            <p className="font-medium text-[var(--text-primary)]">
              Nenhuma conta bancária cadastrada
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use &quot;Nova conta&quot; para cadastrar a primeira.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Apelido</th>
                  <th className="px-4 py-3 font-semibold">Banco</th>
                  <th className="px-4 py-3 font-semibold">Agência/Conta</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Chave PIX</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {account.description}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {account.bankName}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {account.agency || account.accountNumber
                        ? `${account.agency ?? "—"} / ${account.accountNumber ?? "—"}`
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {account.accountType
                        ? BANK_ACCOUNT_TYPE_LABELS[account.accountType]
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {account.pixKey
                        ? `${account.pixKeyType ? `${PIX_KEY_TYPE_LABELS[account.pixKeyType]}: ` : ""}${account.pixKey}`
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="bank-account.update">
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            title="Editar"
                            aria-label="Editar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <Pencil size={16} />
                          </button>
                        </Can>

                        <Can permission="bank-account.delete">
                          <button
                            type="button"
                            onClick={() => void remove(account)}
                            title="Excluir"
                            aria-label="Excluir"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPageLayout>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingId ? "Editar conta bancária" : "Nova conta bancária"}
              </h2>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Apelido (ex.: Conta Corrente Itaú)
                  </label>

                  <input
                    className={fieldClass}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Banco</label>

                  <input
                    className={fieldClass}
                    value={form.bankName}
                    onChange={(e) =>
                      setForm({ ...form, bankName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Agência</label>

                  <input
                    className={fieldClass}
                    value={form.agency}
                    onChange={(e) =>
                      setForm({ ...form, agency: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Conta</label>

                  <input
                    className={fieldClass}
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm({ ...form, accountNumber: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Tipo de conta</label>

                  <select
                    className={fieldClass}
                    value={form.accountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        accountType: e.target.value as BankAccountType | "",
                      })
                    }
                  >
                    <option value="">—</option>
                    {Object.entries(BANK_ACCOUNT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Tipo de chave PIX</label>

                  <select
                    className={fieldClass}
                    value={form.pixKeyType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pixKeyType: e.target.value as PixKeyType | "",
                      })
                    }
                  >
                    <option value="">—</option>
                    {Object.entries(PIX_KEY_TYPE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Chave PIX</label>

                  <input
                    className={fieldClass}
                    value={form.pixKey}
                    onChange={(e) =>
                      setForm({ ...form, pixKey: e.target.value })
                    }
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
