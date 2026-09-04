"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";

import { maskDocument, maskPhone } from "@/lib/masks";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { PartnerImportModal } from "@/components/partner-import/PartnerImportModal";

import {
  ROLE_LABELS,
  partnerService,
  type BusinessPartner,
  type PartnerPayload,
  type PartnerRole,
} from "@/services/partner.service";

const FILTERS: { label: string; role?: PartnerRole }[] = [
  { label: "Todos" },
  { label: "Clientes", role: "CUSTOMER" },
  { label: "Fornecedores", role: "SUPPLIER" },
  { label: "Transportadoras", role: "CARRIER" },
  { label: "Representantes", role: "SALES_REP" },
];

function date(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
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

export default function ParceirosPage() {
  const exportTableRef = useRef<HTMLTableElement>(null);
  const [partners, setPartners] = useState<
    BusinessPartner[]
  >([]);

  const [role, setRole] = useState<PartnerRole | undefined>();
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] =
    useState<BusinessPartner | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await partnerService.list({
        role,
        search: search || undefined,
      });

      setPartners(result.data);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar os parceiros."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [role, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(partner: BusinessPartner) {
    setEditing(partner);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(
    payload: Partial<PartnerPayload>
  ) {
    setSaving(true);
    setFormError("");

    try {
      if (editing) {
        await partnerService.update(editing.id, payload);
      } else {
        await partnerService.create(payload);
      }

      setModalOpen(false);

      await load();
    } catch (err) {
      setFormError(
        extractMessage(
          err,
          "Não foi possível salvar o parceiro."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(partner: BusinessPartner) {
    const confirmed = window.confirm(
      `Excluir o parceiro ${partner.legalName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await partnerService.remove(partner.id);

      await load();
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível excluir o parceiro."
        )
      );
    }
  }

  return (
    <AppShell workspaceLabel="Parceiros">
      <ListPageLayout
        header={
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Parceiros
                </h1>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Clientes, fornecedores, transportadoras e
                  representantes em um cadastro único.
                </p>
              </div>

              <div className="flex gap-2">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="parceiros"
                  sheetName="Parceiros"
                />

                <Link
                  href="/erp/parceiros/relatorio"
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                >
                  <FileText size={18} />
                  Relatório
                </Link>

                <Can permission="partner.create">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <Upload size={18} />
                    Importar planilha
                  </button>

                  <button
                    type="button"
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Plus size={18} />
                    Novo parceiro
                  </button>
                </Can>
              </div>
            </header>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const active = role === item.role;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setRole(item.role)}
                      className={`
                        rounded-xl border px-3 py-2 text-sm font-medium transition-colors
                        ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-text)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                        }
                      `}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <input
                placeholder="Buscar por nome, documento ou e-mail"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 min-w-64 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
              />
            </div>

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
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-[var(--text-primary)]">
              Nenhum parceiro encontrado
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Cadastre o primeiro parceiro para começar a
              lançar vendas e compras.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table ref={exportTableRef} className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Nome
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Documento
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Contato
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Papéis
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Situação
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {partners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-primary)]">
                        {partner.legalName}
                      </p>

                      {partner.tradeName && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {partner.tradeName}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                      {maskDocument(
                        partner.document,
                        partner.personType
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-[var(--text-secondary)]">
                        {partner.email || "—"}
                      </p>

                      <p className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                        {partner.mobile
                          ? maskPhone(partner.mobile)
                          : partner.phone
                            ? maskPhone(partner.phone)
                            : "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {partner.roles.map((item) => (
                          <span
                            key={item}
                            className="whitespace-nowrap rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary-text)]"
                          >
                            {ROLE_LABELS[item]}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {partner.status === "ACTIVE"
                        ? "Ativo"
                        : partner.status === "INACTIVE"
                          ? "Inativo"
                          : "Bloqueado"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Can permission="partner.update">
                          <button
                            type="button"
                            onClick={() => openEdit(partner)}
                            aria-label="Editar"
                            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil size={16} />
                          </button>
                        </Can>

                        <Can permission="partner.delete">
                          <button
                            type="button"
                            onClick={() =>
                              void handleRemove(partner)
                            }
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {editing
                    ? "Editar parceiro"
                    : "Novo parceiro"}
                </h2>

                {editing &&
                  (editing.createdByName ||
                    editing.updatedByName) && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {[
                        editing.createdByName &&
                          `Criado por ${editing.createdByName} em ${date(editing.createdAt)}`,
                        editing.updatedByName &&
                          editing.updatedByName !==
                            editing.createdByName &&
                          `Última alteração por ${editing.updatedByName}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <PartnerForm
              partner={editing}
              saving={saving}
              error={formError}
              onSubmit={handleSubmit}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}

      {importOpen && (
        <PartnerImportModal
          onClose={() => setImportOpen(false)}
          onSaved={() => void load()}
        />
      )}
    </AppShell>
  );
}
