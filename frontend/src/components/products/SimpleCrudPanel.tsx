"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Can } from "@/components/auth/Can";

/**
 * Painel de cadastro simples reutilizável.
 *
 * Categorias, marcas e unidades de medida têm exatamente a mesma
 * mecânica (listar, criar, editar, excluir) mudando apenas os
 * rótulos e os campos. Um componente genérico evita manter três
 * telas quase idênticas.
 */

export interface SimpleRecord {
  id: string;
  active: boolean;
  [key: string]: unknown;
}

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  maxLength?: number;
  width?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

interface CrudService<T> {
  list: (search?: string) => Promise<{ data: T[] }>;
  create: (payload: Record<string, unknown>) => Promise<T>;
  update: (
    id: string,
    payload: Record<string, unknown>
  ) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

interface Props<T extends SimpleRecord> {
  title: string;
  singular: string;
  fields: FieldDef[];
  service: CrudService<T>;
  permissionPrefix: string;
}

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

export function SimpleCrudPanel<T extends SimpleRecord>({
  title,
  singular,
  fields,
  service,
  permissionPrefix,
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState<
    Record<string, string>
  >({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await service.list();

      setItems(result.data ?? []);
      setError("");
    } catch (err) {
      setError(
        extractMessage(
          err,
          `Não foi possível carregar ${title.toLowerCase()}.`
        )
      );
    } finally {
      setLoading(false);
    }
  }, [service, title]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    const initial: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.defaultValue) {
        initial[field.key] = field.defaultValue;
      }
    });

    setEditingId("new");
    setDraft(initial);
    setError("");
  }

  function startEdit(item: T) {
    const initial: Record<string, string> = {};

    fields.forEach((field) => {
      initial[field.key] = String(
        item[field.key] ?? ""
      );
    });

    setDraft(initial);
    setEditingId(item.id);
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setDraft({});
  }

  async function save() {
    const missing = fields.find(
      (field) =>
        field.required && !(draft[field.key] ?? "").trim()
    );

    if (missing) {
      setError(`${missing.label} é obrigatório.`);

      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {};

      fields.forEach((field) => {
        const value = (draft[field.key] ?? "").trim();

        payload[field.key] =
          value.length > 0 ? value : undefined;
      });

      if (editingId === "new") {
        await service.create(payload);
      } else if (editingId) {
        await service.update(editingId, payload);
      }

      cancel();

      await load();
    } catch (err) {
      setError(
        extractMessage(
          err,
          `Não foi possível salvar ${singular.toLowerCase()}.`
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: T) {
    const label = String(
      item[fields[0].key] ?? singular
    );

    if (
      !window.confirm(`Excluir ${singular} "${label}"?`)
    ) {
      return;
    }

    try {
      await service.remove(item.id);

      await load();
    } catch (err) {
      setError(
        extractMessage(
          err,
          `Não foi possível excluir ${singular.toLowerCase()}.`
        )
      );
    }
  }

  const inputClass = `
    h-10 w-full rounded-lg border border-[var(--border)]
    bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
    outline-none focus:border-[var(--primary)]
  `;

  return (
    <section className="rounded-2xl border border-[var(--border)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-[var(--text-primary)]">
          {title}
        </h2>

        <Can permission={`${permissionPrefix}.create`}>
          <button
            type="button"
            onClick={startCreate}
            disabled={editingId !== null}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
          >
            <Plus size={16} />
            Novo
          </button>
        </Can>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] p-2.5 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {editingId === "new" && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--primary)] p-2">
              {fields.map((field) =>
                field.type === "select" ? (
                  <select
                    key={field.key}
                    className={`${inputClass} ${field.width ?? ""}`}
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: e.target.value,
                      }))
                    }
                  >
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    key={field.key}
                    autoFocus={field === fields[0]}
                    placeholder={field.label}
                    maxLength={field.maxLength}
                    className={`${inputClass} ${field.width ?? ""}`}
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void save();
                      if (e.key === "Escape") cancel();
                    }}
                  />
                )
              )}

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                aria-label="Salvar"
                className="rounded-lg bg-[var(--primary)] p-2 text-[var(--primary-contrast)] disabled:opacity-50"
              >
                <Check size={16} />
              </button>

              <button
                type="button"
                onClick={cancel}
                aria-label="Cancelar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {items.length === 0 && editingId !== "new" ? (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              Nenhum registro cadastrado.
            </p>
          ) : (
            items.map((item) =>
              editingId === item.id ? (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--primary)] p-2"
                >
                  {fields.map((field) =>
                    field.type === "select" ? (
                      <select
                        key={field.key}
                        className={`${inputClass} ${field.width ?? ""}`}
                        value={draft[field.key] ?? ""}
                        onChange={(e) =>
                          setDraft((previous) => ({
                            ...previous,
                            [field.key]: e.target.value,
                          }))
                        }
                      >
                        {(field.options ?? []).map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        key={field.key}
                        placeholder={field.label}
                        maxLength={field.maxLength}
                        className={`${inputClass} ${field.width ?? ""}`}
                        value={draft[field.key] ?? ""}
                        onChange={(e) =>
                          setDraft((previous) => ({
                            ...previous,
                            [field.key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void save();
                          if (e.key === "Escape") cancel();
                        }}
                      />
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving}
                    aria-label="Salvar"
                    className="rounded-lg bg-[var(--primary)] p-2 text-[var(--primary-contrast)] disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={cancel}
                    aria-label="Cancelar"
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {String(item[fields[0].key] ?? "")}
                    </p>

                    {fields[1] && item[fields[1].key] ? (
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {String(item[fields[1].key])}
                      </p>
                    ) : null}
                  </div>

                  <Can
                    permission={`${permissionPrefix}.update`}
                  >
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label="Editar"
                      className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <Pencil size={14} />
                    </button>
                  </Can>

                  <Can
                    permission={`${permissionPrefix}.delete`}
                  >
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      aria-label="Excluir"
                      className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Can>
                </div>
              )
            )
          )}
        </div>
      )}
    </section>
  );
}
