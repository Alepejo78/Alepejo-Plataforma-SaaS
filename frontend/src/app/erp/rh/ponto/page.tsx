"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  KeyRound,
  Pencil,
  ScanBarcode,
  Undo2,
  X,
} from "lucide-react";

import { AppShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { ExportButton } from "@/components/ui/ExportButton";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { useAuth } from "@/providers/AuthProvider";

import {
  employeeService,
  type Employee,
} from "@/services/hr.service";

import {
  minutesToLabel,
  timeEntryService,
  type DaySummary,
  type TimeEntryAdjustment,
} from "@/services/time-tracking.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "pt-BR",
    { timeZone: "UTC" }
  );
}

function timeLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function toTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function dateTimeLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthInput() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-01`;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function emptyAdjustForm() {
  return {
    start: "",
    breakStart: "",
    breakEnd: "",
    end: "",
    justification: "",
  };
}

export default function ControleDePontoPage() {
  const { can } = useAuth();
  // Sem `employee.view` (não é RH/admin) o backend já força qualquer
  // filtro pro próprio colaborador (ver resolveViewableEmployeeId) —
  // aqui só escondemos a busca e pré-preenchemos, pra não obrigar
  // quem só vê a si mesmo a se procurar numa lista.
  const isSelfService = !can("employee.view");

  const exportTableRef = useRef<HTMLTableElement>(null);
  const [from, setFrom] = useState(firstDayOfMonthInput());
  const [to, setTo] = useState(todayInput());
  const [employeeFilterId, setEmployeeFilterId] = useState("");
  const [employeeFilterLabel, setEmployeeFilterLabel] =
    useState("");

  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [regEmployeeId, setRegEmployeeId] = useState("");
  const [regEmployeeLabel, setRegEmployeeLabel] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regFeedback, setRegFeedback] = useState("");
  const [regError, setRegError] = useState("");

  const [scanCode, setScanCode] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [scanError, setScanError] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [actionKey, setActionKey] = useState("");
  const [actionError, setActionError] = useState("");

  const [adjustSummary, setAdjustSummary] =
    useState<DaySummary | null>(null);
  const [adjustForm, setAdjustForm] = useState(
    emptyAdjustForm()
  );
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const [consultSummary, setConsultSummary] =
    useState<DaySummary | null>(null);
  const [consultList, setConsultList] = useState<
    TimeEntryAdjustment[]
  >([]);
  const [consultLoading, setConsultLoading] = useState(false);

  useEffect(() => {
    if (!isSelfService) {
      return;
    }

    employeeService
      .getMine()
      .then((own) => {
        setEmployeeFilterId(own.id);
        setEmployeeFilterLabel(own.name);
        setRegEmployeeId(own.id);
        setRegEmployeeLabel(own.name);
      })
      .catch(() => {
        // sem colaborador vinculado — segue sem pré-selecionar, o
        // backend segue travando em "nenhum" (ver findMine)
      });
  }, [isSelfService]);

  const searchEmployees = useCallback(async (query: string) => {
    const result = await employeeService.list({
      search: query || undefined,
      limit: 20,
    });

    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");

    try {
      const result = await timeEntryService.getDaySummary({
        employeeId: employeeFilterId || undefined,
        from: from || undefined,
        to: to || undefined,
      });

      setSummaries(result);
    } catch (err) {
      setListError(
        extractMessage(
          err,
          "Não foi possível carregar a folha de ponto."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [employeeFilterId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerNow() {
    if (!regEmployeeId) {
      setRegError("Selecione o colaborador.");

      return;
    }

    setRegistering(true);
    setRegError("");
    setRegFeedback("");

    try {
      await timeEntryService.create({ employeeId: regEmployeeId });

      setRegFeedback(
        `Ponto registrado para ${regEmployeeLabel} às ${new Date().toLocaleTimeString(
          "pt-BR",
          { hour: "2-digit", minute: "2-digit" }
        )}.`
      );

      await load();
    } catch (err) {
      setRegError(
        extractMessage(
          err,
          "Não foi possível registrar o ponto."
        )
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleScanSubmit() {
    const code = scanCode.trim();

    if (!code) {
      return;
    }

    setScanError("");
    setScanFeedback("");

    try {
      const entry = await timeEntryService.create({
        employeeId: code,
        source: "BARCODE",
      });

      setScanFeedback(
        `Ponto registrado para ${entry.employee?.name ?? "colaborador"} às ${new Date().toLocaleTimeString(
          "pt-BR",
          { hour: "2-digit", minute: "2-digit" }
        )}.`
      );

      await load();
    } catch (err) {
      setScanError(
        extractMessage(
          err,
          "Código não corresponde a um colaborador."
        )
      );
    } finally {
      setScanCode("");
      scanInputRef.current?.focus();
    }
  }

  async function approveDay(employeeId: string, date: string) {
    setActionKey(`approve-${employeeId}-${date}`);
    setActionError("");

    try {
      await timeEntryService.approve(employeeId, date);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(
          err,
          "Não foi possível aprovar o dia."
        )
      );
    } finally {
      setActionKey("");
    }
  }

  async function reopenDay(employeeId: string, date: string) {
    setActionKey(`reopen-${employeeId}-${date}`);
    setActionError("");

    try {
      await timeEntryService.reopen(employeeId, date);

      await load();
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível reabrir o dia.")
      );
    } finally {
      setActionKey("");
    }
  }

  function openAdjust(summary: DaySummary) {
    setAdjustSummary(summary);
    setAdjustForm({
      start: toTimeInput(summary.slots.start),
      breakStart: toTimeInput(summary.slots.breakStart),
      breakEnd: toTimeInput(summary.slots.breakEnd),
      end: toTimeInput(summary.slots.end),
      justification: "",
    });
    setAdjustError("");
  }

  async function confirmAdjust() {
    if (!adjustSummary) {
      return;
    }

    if (!adjustForm.justification.trim()) {
      setAdjustError("Informe a justificativa do ajuste.");

      return;
    }

    setAdjustSaving(true);
    setAdjustError("");

    try {
      await timeEntryService.adjust({
        employeeId: adjustSummary.employeeId,
        date: adjustSummary.date,
        start: adjustForm.start || undefined,
        breakStart: adjustForm.breakStart || undefined,
        breakEnd: adjustForm.breakEnd || undefined,
        end: adjustForm.end || undefined,
        justification: adjustForm.justification.trim(),
      });

      setAdjustSummary(null);

      await load();
    } catch (err) {
      setAdjustError(
        extractMessage(
          err,
          "Não foi possível ajustar o dia."
        )
      );
    } finally {
      setAdjustSaving(false);
    }
  }

  async function openConsult(summary: DaySummary) {
    setConsultSummary(summary);
    setConsultLoading(true);
    setConsultList([]);

    try {
      const result = await timeEntryService.getAdjustments({
        employeeId: summary.employeeId,
        from: summary.date,
        to: summary.date,
      });

      setConsultList(result);
    } catch {
      setConsultList([]);
    } finally {
      setConsultLoading(false);
    }
  }

  return (
    <AppShell workspaceLabel="Controle de ponto">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
              <Clock size={22} />
              Controle de ponto
            </h1>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Registro de batidas, folha de ponto por período e
              aprovação dos dias trabalhados.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/erp/rh/ponto/acompanhamento"
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              <BarChart3 size={18} />
              Acompanhamento de horas
            </Link>

            <Can permission="time-clock.manage-api-key">
              <Link
                href="/erp/rh/ponto/chave-api"
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
              >
                <KeyRound size={18} />
                Chave de API (relógio de ponto)
              </Link>
            </Can>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="mb-3 font-semibold text-[var(--text-primary)]">
              Registrar ponto (manual)
            </h2>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <label className={labelClass}>Colaborador</label>

                {isSelfService ? (
                  <div className="flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-3 text-sm text-[var(--text-primary)]">
                    {regEmployeeLabel || "Carregando..."}
                  </div>
                ) : (
                  <SearchSelect<Employee>
                    displayLabel={regEmployeeLabel}
                    search={searchEmployees}
                    getId={(e) => e.id}
                    getLabel={(e) => e.name}
                    placeholder="Digite para buscar o colaborador..."
                    onSelect={(e) => {
                      setRegEmployeeId(e?.id ?? "");
                      setRegEmployeeLabel(e?.name ?? "");
                      setRegFeedback("");
                    }}
                  />
                )}
              </div>

              <button
                type="button"
                disabled={registering}
                onClick={() => void registerNow()}
                className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {registering ? "Registrando..." : "Bater ponto agora"}
              </button>
            </div>

            {regFeedback && (
              <p className="mt-2 text-xs text-[var(--success)]">
                {regFeedback}
              </p>
            )}

            {regError && (
              <p className="mt-2 text-xs text-[var(--danger)]">
                {regError}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
              <ScanBarcode size={18} />
              Leitor de código de barras / QR Code
            </h2>

            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Aponte o leitor pro código/crachá do colaborador (ou
              digite e aperte Enter) — registra o ponto na hora.
            </p>

            <input
              ref={scanInputRef}
              autoFocus
              className="h-9 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
              placeholder="Código..."
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleScanSubmit();
                }
              }}
            />

            {scanFeedback && (
              <p className="mt-2 text-xs text-[var(--success)]">
                {scanFeedback}
              </p>
            )}

            {scanError && (
              <p className="mt-2 text-xs text-[var(--danger)]">
                {scanError}
              </p>
            )}
          </section>
        </div>

        <ListPageLayout
          header={
            <>
              <div className="flex justify-end">
                <ExportButton
                  tableRef={exportTableRef}
                  filename="folha-de-ponto"
                  sheetName="Folha de ponto"
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {!isSelfService && (
                  <div className="min-w-56">
                    <label className={labelClass}>
                      Colaborador
                    </label>

                    <SearchSelect<Employee>
                      displayLabel={employeeFilterLabel}
                      search={searchEmployees}
                      getId={(e) => e.id}
                      getLabel={(e) => e.name}
                      placeholder="Todos os colaboradores"
                      onSelect={(e) => {
                        setEmployeeFilterId(e?.id ?? "");
                        setEmployeeFilterLabel(e?.name ?? "");
                      }}
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>De</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Até</label>

                  <input
                    type="date"
                    className={fieldClass}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>

              {listError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {listError}
                </div>
              )}

              {actionError && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {actionError}
                </div>
              )}
            </>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-[var(--surface-hover)]"
                />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-[var(--text-primary)]">
                Nenhuma batida registrada no período
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table ref={exportTableRef} className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Colaborador
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Data
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Início
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Int. início
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Int. fim
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Saída
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Trabalhadas
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Extras
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Ajustada
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {summaries.map((s) => {
                    const key = `${s.employeeId}_${s.date}`;
                    const approving =
                      actionKey === `approve-${key}`;
                    const reopening =
                      actionKey === `reopen-${key}`;

                    return (
                      <tr
                        key={key}
                        className="border-t border-[var(--border)] align-top"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {s.employeeName}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {dateLabel(s.date)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {timeLabel(s.slots.start)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {timeLabel(s.slots.breakStart)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {timeLabel(s.slots.breakEnd)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                          {timeLabel(s.slots.end)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                          {minutesToLabel(s.workedMinutes)}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-[var(--warning)]">
                          {s.extraMinutes > 0
                            ? minutesToLabel(s.extraMinutes)
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {s.hasAdjustment ? (
                            <button
                              type="button"
                              onClick={() => void openConsult(s)}
                              className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--warning)] transition-colors hover:opacity-80"
                            >
                              Sim — consultar
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">
                              Não
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              s.status === "APPROVED"
                                ? "bg-[var(--success-soft)] text-[var(--success)]"
                                : "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {s.status === "APPROVED"
                              ? "Aprovado"
                              : "Pendente"}
                          </span>

                          {s.selfReported && (
                            <p
                              className="mt-1 text-[11px] text-[var(--text-muted)]"
                              title="O próprio colaborador lançou este dia (Ponto - Manual)"
                            >
                              Lançamento manual
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {s.status === "PENDING" ? (
                              <>
                                <Can permission="time-entry.update">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAdjust(s)
                                    }
                                    title="Ajustar horários"
                                    aria-label="Ajustar horários"
                                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                </Can>

                                <Can permission="time-entry.approve">
                                  <button
                                    type="button"
                                    disabled={approving}
                                    onClick={() =>
                                      void approveDay(
                                        s.employeeId,
                                        s.date
                                      )
                                    }
                                    title="Aprovar dia"
                                    aria-label="Aprovar dia"
                                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)] disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                </Can>
                              </>
                            ) : (
                              <Can permission="time-entry.approve">
                                <button
                                  type="button"
                                  disabled={reopening}
                                  onClick={() =>
                                    void reopenDay(
                                      s.employeeId,
                                      s.date
                                    )
                                  }
                                  title="Reabrir dia"
                                  aria-label="Reabrir dia"
                                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                                >
                                  <Undo2 size={16} />
                                  Reabrir
                                </button>
                              </Can>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ListPageLayout>
      </div>

      {/* Ajustar horários do dia */}
      {adjustSummary && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Ajustar — {adjustSummary.employeeName}
              </h2>

              <button
                type="button"
                onClick={() => setAdjustSummary(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              {dateLabel(adjustSummary.date)} — deixe um campo
              vazio pra remover aquele horário do dia.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Início</label>

                <input
                  type="time"
                  className={fieldClass}
                  value={adjustForm.start}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      start: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Início do intervalo
                </label>

                <input
                  type="time"
                  className={fieldClass}
                  value={adjustForm.breakStart}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      breakStart: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Fim do intervalo
                </label>

                <input
                  type="time"
                  className={fieldClass}
                  value={adjustForm.breakEnd}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      breakEnd: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Saída</label>

                <input
                  type="time"
                  className={fieldClass}
                  value={adjustForm.end}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      end: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-span-2">
                <label className={labelClass}>
                  Justificativa (obrigatória)
                </label>

                <textarea
                  className={`${fieldClass} h-20 resize-none py-2`}
                  value={adjustForm.justification}
                  onChange={(e) =>
                    setAdjustForm({
                      ...adjustForm,
                      justification: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {adjustError && (
              <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                {adjustError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdjustSummary(null)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={adjustSaving}
                onClick={() => void confirmAdjust()}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
              >
                {adjustSaving ? "Salvando..." : "Salvar ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultar ajustes do dia */}
      {consultSummary && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Ajustes — {consultSummary.employeeName}
              </h2>

              <button
                type="button"
                onClick={() => setConsultSummary(null)}
                aria-label="Fechar"
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--text-muted)]">
              {dateLabel(consultSummary.date)}
            </p>

            {consultLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
            ) : consultList.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhum ajuste encontrado.
              </p>
            ) : (
              <div className="space-y-4">
                {consultList.map((adj) => (
                  <div
                    key={adj.id}
                    className="rounded-xl border border-[var(--border)] p-4"
                  >
                    <p className="text-xs text-[var(--text-muted)]">
                      {dateTimeLabel(adj.createdAt)}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="mb-1 font-semibold text-[var(--text-secondary)]">
                          Antes
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Início: {timeLabel(adj.beforeStart ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Int. início:{" "}
                          {timeLabel(adj.beforeBreakStart ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Int. fim:{" "}
                          {timeLabel(adj.beforeBreakEnd ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Saída: {timeLabel(adj.beforeEnd ?? null)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 font-semibold text-[var(--text-secondary)]">
                          Depois
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Início: {timeLabel(adj.afterStart ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Int. início:{" "}
                          {timeLabel(adj.afterBreakStart ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Int. fim:{" "}
                          {timeLabel(adj.afterBreakEnd ?? null)}
                        </p>
                        <p className="text-[var(--text-primary)]">
                          Saída: {timeLabel(adj.afterEnd ?? null)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold">
                        Justificativa:
                      </span>{" "}
                      {adj.justification}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setConsultSummary(null)}
                className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
