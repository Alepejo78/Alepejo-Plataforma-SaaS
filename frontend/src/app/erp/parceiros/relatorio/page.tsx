"use client";

import { ReportAccessGuard } from "@/components/reports/ReportAccessGuard";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { maskDocument, maskPhone } from "@/lib/masks";
import {
  ROLE_LABELS,
  partnerService,
  type BusinessPartner,
  type PartnerRole,
} from "@/services/partner.service";
import { companyService } from "@/services/company.service";
import { exportCsv } from "@/lib/exportCsv";

const ROLE_FILTERS: { label: string; role?: PartnerRole }[] = [
  { label: "Todos" },
  { label: "Clientes", role: "CUSTOMER" },
  { label: "Fornecedores", role: "SUPPLIER" },
  { label: "Transportadoras", role: "CARRIER" },
  { label: "Representantes", role: "SALES_REP" },
];

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function RelatorioParceirosPageInner() {
  const [companyName, setCompanyName] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<PartnerRole | undefined>();
  const [state, setState] = useState("");

  const [partners, setPartners] = useState<BusinessPartner[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    companyService
      .getMine()
      .then((c) =>
        setCompanyName(c.tradeName || c.legalName || "")
      )
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await partnerService.list({
        search: search || undefined,
        role,
        limit: 100,
      });

      setPartners(result.data);
    } catch (err) {
      setError("Não foi possível carregar os parceiros.");
      void err;
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);

    return () => clearTimeout(timer);
  }, [load]);

  const filtered = partners.filter(
    (p) =>
      !state ||
      (p.state ?? "")
        .toLowerCase()
        .includes(state.toLowerCase())
  );

  function handleExport() {
    exportCsv(
      "relatorio-parceiros",
      [
        "Nome",
        "Documento",
        "Papéis",
        "Telefone",
        "Celular",
        "E-mail",
        "Cidade",
        "UF",
      ],
      filtered.map((p) => [
        p.tradeName || p.legalName,
        maskDocument(p.document),
        p.roles.map((r) => ROLE_LABELS[r]).join(" / "),
        p.phone ? maskPhone(p.phone) : "",
        p.mobile ? maskPhone(p.mobile) : "",
        p.email ?? "",
        p.city ?? "",
        p.state ?? "",
      ])
    );
  }

  const today = new Date().toLocaleDateString("pt-BR");

  const title =
    role === "CUSTOMER"
      ? "Relatório de Clientes"
      : role === "SUPPLIER"
        ? "Relatório de Fornecedores"
        : "Relatório de Parceiros";

  return (
    <div className="mx-auto max-w-6xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
        }
      `}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/erp/parceiros"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Printer size={18} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[var(--border)] p-4 print:hidden">
        <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Filtros
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {ROLE_FILTERS.map((item) => {
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Buscar</label>

            <input
              className={fieldClass}
              placeholder="Nome ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>UF</label>

            <input
              className={fieldClass}
              placeholder="Ex.: PR"
              maxLength={2}
              value={state}
              onChange={(e) =>
                setState(e.target.value.toUpperCase())
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)] print:text-black">
          {title}
        </h1>

        <p className="text-sm text-[var(--text-muted)] print:text-black">
          {companyName} — gerado em {today} —{" "}
          {filtered.length}{" "}
          {filtered.length === 1 ? "registro" : "registros"}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)] print:hidden">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] print:rounded-none print:border-black">
        <table className="w-full text-left text-sm print:text-xs">
          <thead className="bg-[var(--surface-hover)] text-[var(--text-secondary)] print:bg-transparent print:text-black">
            <tr>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Nome
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Documento
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Papéis
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Telefone
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Celular
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                E-mail
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                Cidade
              </th>
              <th className="px-3 py-2 font-semibold print:border print:border-black">
                UF
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[var(--text-muted)]"
                >
                  Nenhum parceiro encontrado com esses
                  filtros.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] print:border-black"
                >
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)] print:border print:border-black print:text-black">
                    {p.tradeName || p.legalName}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {maskDocument(p.document)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.roles
                      .map((r) => ROLE_LABELS[r])
                      .join(" / ")}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.phone ? maskPhone(p.phone) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.mobile ? maskPhone(p.mobile) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.email || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.city || "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)] print:border print:border-black print:text-black">
                    {p.state || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RelatorioParceirosPage() {
  return (
    <ReportAccessGuard permission="partner.report">
      <RelatorioParceirosPageInner />
    </ReportAccessGuard>
  );
}
