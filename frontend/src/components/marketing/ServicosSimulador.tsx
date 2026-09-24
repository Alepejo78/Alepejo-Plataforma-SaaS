"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Info,
  Plus,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";

import { Modal } from "./Modal";
import {
  CATALOG,
  STORAGE_KEY,
  businessDates,
  dateKey,
  dateLabel,
  fullDate,
  getCat,
  initials,
  isAvailable,
  isValidState,
  localDate,
  minutes,
  money,
  proById,
  seed,
  serviceById,
  timeLabel,
  type Booking,
  type SimState,
} from "./servicos-simulador-data";

type Tab = "agenda" | "caixa" | "dashboard";

interface Draft {
  step: 1 | 2 | 3 | 4 | 5;
  category: string;
  service: string | null;
  professional: string | null;
  date: string;
  time: string | null;
  customer: string;
  target: string;
}

type Util =
  | { kind: "pay"; id: string; method: string }
  | { kind: "cancel"; id: string }
  | { kind: "reset" }
  | null;

const STATUS_LABEL = { confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" } as const;
const STATUS_CLASS = {
  confirmed: "bg-[color-mix(in_srgb,var(--mkt-accent-2)_18%,transparent)] text-[var(--mkt-accent)]",
  completed: "bg-[#0d7a6e1a] text-[#0d7a6e]",
  cancelled: "bg-[color-mix(in_srgb,var(--mkt-muted)_16%,transparent)] text-[var(--mkt-muted)]",
} as const;

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";
const btnDark = `${btnBase} bg-[var(--mkt-ink)] text-[var(--mkt-bg)]`;
const btnGold = `${btnBase} sv-btn-gold`;
const btnLine = `${btnBase} border border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-[var(--mkt-ink)] hover:border-[var(--mkt-accent-2)]`;
const miniBtn =
  "rounded-lg border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--mkt-ink)] transition-all hover:border-[var(--mkt-accent-2)] active:scale-95";
const fieldSm =
  "rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-2 text-xs text-[var(--mkt-ink)] outline-none transition-colors focus:border-[var(--mkt-accent-2)]";
const fieldCls =
  "w-full rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-3 py-2.5 text-sm text-[var(--mkt-ink)] outline-none transition-colors focus:border-[var(--mkt-accent-2)]";

function Kpi({
  label,
  value,
  detail,
  primary = false,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  primary?: boolean;
  icon: typeof Calendar;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        primary
          ? "border-[var(--sv-night)] bg-[var(--sv-night)] text-[var(--sv-cream)]"
          : "border-[var(--mkt-border)] bg-[var(--mkt-surface)]"
      }`}
    >
      <div className={`flex items-center justify-between gap-2 text-xs ${primary ? "text-[var(--sv-cream)]/75" : "text-[var(--mkt-muted)]"}`}>
        {label}
        <Icon size={15} className={primary ? "text-[var(--sv-gold)]" : ""} aria-hidden />
      </div>
      <p className="font-display mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{value}</p>
      <p className={`mt-0.5 text-[11px] ${primary ? "text-[var(--sv-gold-soft)]" : "text-[var(--mkt-muted)]"}`}>{detail}</p>
    </div>
  );
}

export function ServicosSimulador() {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [state, setState] = useState<SimState | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("barbearia");
  const [businessCategory, setBusinessCategory] = useState("barbearia");
  const [tab, setTab] = useState<Tab>("agenda");
  const [panelDate, setPanelDate] = useState("");
  const [proFilter, setProFilter] = useState("all");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [util, setUtil] = useState<Util>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [formError, setFormError] = useState("");
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const demoDate = dates[0] ?? "";

  // Datas dependem do dia de hoje: só calcula no cliente, depois de montar.
  useEffect(() => {
    const t = dateKey(new Date());
    const list = businessDates(t);
    let loaded: SimState | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (isValidState(saved, list[0])) loaded = saved;
    } catch {
      loaded = null;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- inicialização só no cliente (evita divergência de hidratação: depende da data e do localStorage) */
    setToday(t);
    setDates(list);
    setPanelDate(list[0]);
    setState(loaded ?? seed(list[0]));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const persist = useCallback((next: SimState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* sem armazenamento: a simulação segue só nesta sessão */
    }
  }, []);

  const showToast = useCallback((message: string) => setToast({ text: message, n: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const bookings = useMemo(() => state?.bookings ?? [], [state]);

  if (!ready || !state) {
    return (
      <div className="sv-skel h-[32rem] rounded-3xl" aria-busy="true" aria-label="Carregando simulação" />
    );
  }

  const cat = getCat(selectedCategory);
  const bizCat = getCat(businessCategory);
  const priceOf = (b: Booking) => serviceById(b.service)?.price ?? 0;
  const sum = (list: Booking[]) => list.reduce((n, b) => n + priceOf(b), 0);

  // ───────── Agendamento (fluxo do cliente) ─────────
  function openBooking(serviceId?: string) {
    const service = serviceId ? serviceById(serviceId) : undefined;
    setFormError("");
    setDraft({
      step: 1,
      category: service ? service.category : selectedCategory,
      service: service?.id ?? null,
      professional: null,
      date: demoDate,
      time: null,
      customer: "Cliente demonstração",
      target: "",
    });
  }

  function patchDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function confirmBooking() {
    if (!draft || !draft.service || !draft.professional || !draft.time) return;
    const customer = draft.customer.trim();
    if (customer.length < 2) {
      setFormError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    const service = serviceById(draft.service);
    if (!isAvailable(bookings, today, draft.date, draft.time, draft.professional, service)) {
      patchDraft({ step: 3, time: null });
      showToast("Este horário está ocupado. Escolha outro horário disponível.");
      return;
    }
    const id = `AP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const booking: Booking = {
      id,
      category: draft.category,
      service: draft.service,
      professional: draft.professional,
      date: draft.date,
      time: draft.time,
      customer,
      target: draft.target.trim(),
      status: "confirmed",
      paid: false,
      paymentMethod: null,
      paymentDate: null,
    };
    persist({ ...state!, bookings: [...bookings, booking] });
    setLastBookingId(id);
    setBusinessCategory(draft.category);
    setPanelDate(draft.date);
    setProFilter("all");
    setFormError("");
    patchDraft({ step: 5, customer, target: booking.target });
  }

  // ───────── Gestão ─────────
  function completeBooking(id: string) {
    persist({
      ...state!,
      bookings: bookings.map((b) => (b.id === id && b.status === "confirmed" ? { ...b, status: "completed" } : b)),
    });
    showToast("Atendimento concluído. O valor está disponível para receber no caixa.");
  }

  function confirmUtil() {
    if (!util) return;
    if (util.kind === "pay") {
      persist({
        ...state!,
        bookings: bookings.map((b) =>
          b.id === util.id && b.status === "completed" && !b.paid
            ? { ...b, paid: true, paymentMethod: util.method, paymentDate: panelDate }
            : b,
        ),
      });
      showToast("Recebimento demonstrativo registrado. Caixa e dashboard atualizados.");
    } else if (util.kind === "cancel") {
      persist({
        ...state!,
        bookings: bookings.map((b) => (b.id === util.id && b.status === "confirmed" ? { ...b, status: "cancelled" } : b)),
      });
      showToast("Agendamento cancelado. O horário está livre novamente.");
    } else {
      persist(seed(demoDate));
      setPanelDate(demoDate);
      setProFilter("all");
      showToast("Demonstração reiniciada. Tudo pronto para explorar.");
    }
    setUtil(null);
  }

  const dayBookings = bookings.filter((b) => b.category === businessCategory && b.date === panelDate);
  const activeDay = dayBookings.filter((b) => b.status !== "cancelled");
  const paidDay = bookings.filter((b) => b.category === businessCategory && b.paid && b.paymentDate === panelDate);

  function panelHeader(title: string, description: string, extra?: React.ReactNode) {
    return (
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-[var(--mkt-muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sim-panel-date">
            Data da gestão
          </label>
          <input
            id="sim-panel-date"
            type="date"
            value={panelDate}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setPanelDate(e.target.value);
            }}
            className={fieldSm}
          />
          {extra}
        </div>
      </div>
    );
  }

  function renderAgenda() {
    const list = dayBookings
      .filter((b) => proFilter === "all" || b.professional === proFilter)
      .sort((a, b) => a.time.localeCompare(b.time));
    return (
      <>
        {panelHeader(
          "Sua agenda, no seu ritmo.",
          `${bizCat.business} · ${fullDate(panelDate)}`,
          <>
            <label className="sr-only" htmlFor="sim-pro-filter">
              Filtrar profissional
            </label>
            <select
              id="sim-pro-filter"
              value={proFilter}
              onChange={(e) => setProFilter(e.target.value)}
              className={fieldSm}
            >
              <option value="all">Todos os profissionais</option>
              {bizCat.pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" className={`${btnDark} !px-4 !py-2 text-xs`} onClick={() => openBooking(bizCat.services[0].id)}>
              <Plus size={14} aria-hidden /> Agendar
            </button>
          </>,
        )}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Agendamentos" value={activeDay.length} detail="No dia selecionado" primary icon={Calendar} />
          <Kpi label="Confirmados" value={activeDay.filter((b) => b.status === "confirmed").length} detail="Aguardando atendimento" icon={Clock} />
          <Kpi label="Concluídos" value={activeDay.filter((b) => b.status === "completed").length} detail="Atendimentos finalizados" icon={Check} />
          <Kpi label="Valor agendado" value={money(sum(activeDay))} detail="Inclui pendentes e concluídos" icon={Wallet} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
          {list.length === 0 ? (
            <div className="p-9 text-center text-sm text-[var(--mkt-muted)]">
              <strong className="block text-[var(--mkt-ink)]">Um dia cheio de possibilidades.</strong>
              Nenhum agendamento neste filtro. Escolha outra data ou reserve um horário.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--mkt-border)]">
              {list.map((b) => {
                const s = serviceById(b.service)!;
                const p = proById(b.professional)!;
                return (
                  <li key={b.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-4 py-3 text-sm sm:grid-cols-[4rem_1.4fr_1fr_auto_auto]">
                    <div className="font-semibold [font-variant-numeric:tabular-nums]">
                      {b.time}
                      <small className="block text-[11px] font-normal text-[var(--mkt-muted)]">{timeLabel(minutes(b.time) + s.duration)}</small>
                    </div>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--mkt-surface-2)] text-[11px] font-semibold text-[var(--mkt-accent)]">
                        {initials(b.customer)}
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-[13px] font-semibold">{b.customer}</strong>
                        <small className="block truncate text-[11px] text-[var(--mkt-muted)]">
                          {s.name}
                          {b.target ? ` · ${b.target}` : ""}
                        </small>
                      </div>
                    </div>
                    <div className="hidden text-xs text-[var(--mkt-muted)] sm:block">{p.name}</div>
                    <span className={`hidden rounded-md px-2 py-1 text-[11px] font-semibold sm:inline-block ${STATUS_CLASS[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                    <div className="flex items-center justify-end gap-1.5">
                      {b.status === "confirmed" ? (
                        <>
                          <button type="button" className={miniBtn} onClick={() => completeBooking(b.id)}>
                            Concluir
                          </button>
                          <button
                            type="button"
                            className="flex size-8 items-center justify-center rounded-full border border-[var(--mkt-border)] transition-all hover:border-[var(--mkt-accent-2)] active:scale-95"
                            aria-label={`Cancelar agendamento de ${b.customer}`}
                            onClick={() => setUtil({ kind: "cancel", id: b.id })}
                          >
                            <X size={14} aria-hidden />
                          </button>
                        </>
                      ) : b.status === "completed" && !b.paid ? (
                        <button type="button" className={miniBtn} onClick={() => setUtil({ kind: "pay", id: b.id, method: "Pix" })}>
                          Receber
                        </button>
                      ) : b.paid ? (
                        <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${STATUS_CLASS.completed}`}>Pago</span>
                      ) : (
                        <span className="text-[var(--mkt-muted)]">—</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </>
    );
  }

  function renderCash() {
    const pending = activeDay.filter((b) => !b.paid && b.status === "completed");
    const future = activeDay.filter((b) => !b.paid && b.status === "confirmed");
    const row = (b: Booking, paid: boolean) => {
      const s = serviceById(b.service)!;
      return (
        <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--mkt-surface-2)] text-[11px] font-semibold text-[var(--mkt-accent)]">
            {initials(b.customer)}
          </span>
          <div className="min-w-32 flex-1">
            <span className="text-[13px]">{b.customer}</span>
            <small className="block text-[11px] text-[var(--mkt-muted)]">
              {s.name} · {dateLabel(b.date)} · {b.time}
            </small>
          </div>
          <strong className="[font-variant-numeric:tabular-nums]">{money(s.price)}</strong>
          {paid ? (
            <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${STATUS_CLASS.completed}`}>{b.paymentMethod} · Recebido</span>
          ) : (
            <button type="button" className={miniBtn} onClick={() => setUtil({ kind: "pay", id: b.id, method: "Pix" })}>
              Registrar recebimento
            </button>
          )}
        </li>
      );
    };
    return (
      <>
        {panelHeader("Caixa sob controle.", `${bizCat.business} · Movimentações demonstrativas`)}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Recebido" value={money(sum(paidDay))} detail="Entradas na data selecionada" primary icon={Wallet} />
          <Kpi label="A receber" value={money(sum(pending))} detail="Serviços já concluídos" icon={TrendingUp} />
          <Kpi label="Previsto" value={money(sum(future))} detail="Agendamentos confirmados" icon={Calendar} />
          <Kpi label="Recebimentos" value={paidDay.length} detail="Pagamentos registrados" icon={Check} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
          {pending.length + paidDay.length === 0 ? (
            <div className="p-9 text-center text-sm text-[var(--mkt-muted)]">
              <strong className="block text-[var(--mkt-ink)]">Seu caixa começa por um atendimento.</strong>
              Conclua um serviço na agenda para simular o recebimento.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--mkt-border)]">
              {pending.map((b) => row(b, false))}
              {paidDay.map((b) => row(b, true))}
            </ul>
          )}
        </div>
        <p className="mt-3 text-[11px] text-[var(--mkt-muted)]">
          “Recebido” usa a data do recebimento. “A receber” e “Previsto” usam a data do atendimento.
        </p>
      </>
    );
  }

  function renderDashboard() {
    const revenue = sum(paidDay);
    const completed = activeDay.filter((b) => b.status === "completed").length;
    const duration = activeDay.reduce((n, b) => n + (serviceById(b.service)?.duration ?? 0), 0);
    const capacity = localDate(panelDate).getDay() === 0 ? 0 : bizCat.pros.length * 600;
    const rate = capacity ? Math.round((duration / capacity) * 100) : 0;
    const chart = Array.from({ length: 7 }, (_, i) => {
      const day = localDate(panelDate);
      day.setDate(day.getDate() - (6 - i));
      const key = dateKey(day);
      return {
        key,
        name: day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        value: sum(bookings.filter((b) => b.category === businessCategory && b.paid && b.paymentDate === key)),
      };
    });
    const max = Math.max(1, ...chart.map((d) => d.value));
    const ranks = bizCat.services
      .map((s) => ({ name: s.name, count: activeDay.filter((b) => b.service === s.id).length }))
      .sort((a, b) => b.count - a.count);
    const rankMax = Math.max(1, ...ranks.map((r) => r.count));
    return (
      <>
        {panelHeader("Clareza para o próximo passo.", `${bizCat.business} · Indicadores calculados a partir da demonstração`)}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Receita recebida" value={money(revenue)} detail="No dia selecionado" primary icon={TrendingUp} />
          <Kpi label="Atendimentos" value={completed} detail={`${activeDay.length} agendamentos no dia`} icon={Check} />
          <Kpi label="Ticket médio" value={money(paidDay.length ? revenue / paidDay.length : 0)} detail="Recebido ÷ recebimentos" icon={Wallet} />
          <Kpi label="Ocupação" value={`${rate}%`} detail="Minutos reservados ÷ capacidade" icon={Clock} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <div className="rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5">
            <h4 className="text-sm font-semibold">Receita nos últimos 7 dias</h4>
            <p className="mt-0.5 text-[11px] text-[var(--mkt-muted)]">
              Valores recebidos · {dateLabel(chart[0].key)} a {dateLabel(panelDate)}
            </p>
            <div
              className="mt-4 flex h-44 items-end gap-1.5 sm:gap-2"
              role="img"
              aria-label={`Receita diária: ${chart.map((d) => `${d.name} ${money(d.value)}`).join(", ")}`}
            >
              {chart.map((d) => (
                <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <small className="hidden whitespace-nowrap text-[9px] text-[var(--mkt-muted)] sm:block">{money(d.value)}</small>
                  <div
                    className={`w-full max-w-11 origin-bottom rounded-t-md transition-transform duration-700 ${
                      d.key === panelDate ? "bg-[var(--mkt-accent-2)]" : "bg-[var(--mkt-surface-2)]"
                    }`}
                    style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, minHeight: 2 }}
                  />
                  <span className="text-[10px] text-[var(--mkt-muted)]">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5">
            <h4 className="text-sm font-semibold">Serviços mais agendados</h4>
            <p className="mt-0.5 text-[11px] text-[var(--mkt-muted)]">No dia selecionado · cancelamentos excluídos</p>
            <ul className="mt-4 space-y-4">
              {ranks.map((r, i) => (
                <li key={r.name}>
                  <div className="mb-1.5 flex justify-between gap-2 text-xs">
                    <span>{r.name}</span>
                    <strong>{r.count}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--mkt-surface-2)]">
                    <div
                      className={`h-full origin-left rounded-full transition-transform duration-700 ${i === 0 ? "bg-[var(--mkt-accent-2)]" : "bg-[color-mix(in_srgb,var(--mkt-accent-2)_45%,var(--mkt-surface-2))]"}`}
                      style={{ width: `${(r.count / rankMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[var(--mkt-muted)]">
          Capacidade ilustrativa: 09h às 19h, segunda a sábado, para {bizCat.pros.length} profissionais. Os indicadores se atualizam com as suas ações.
        </p>
      </>
    );
  }

  // ───────── Modal de agendamento ─────────
  function renderBookingBody() {
    if (!draft) return null;

    if (draft.step === 5) {
      const b = bookings.find((x) => x.id === lastBookingId);
      if (!b) return null;
      const s = serviceById(b.service)!;
      const p = proById(b.professional)!;
      return (
        <div className="py-2 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--mkt-accent-3)_18%,transparent)] text-[var(--mkt-accent-3)]">
            <Check size={30} aria-hidden />
          </div>
          <h3 className="font-display text-2xl font-semibold">Seu momento está reservado!</h3>
          <p className="mt-2 text-sm text-[var(--mkt-muted)]">Agendamento demonstrativo confirmado para {b.customer}.</p>
          <div className="mx-auto my-6 max-w-sm rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg)] p-5 text-left">
            <p className="mb-2 text-[10px] font-bold tracking-widest text-[var(--mkt-accent)]">{b.id}</p>
            {[
              ["Serviço", s.name],
              ["Profissional", p.name],
              ["Quando", `${dateLabel(b.date)} · ${b.time}`],
              ["Estabelecimento", getCat(b.category).business],
              ...(b.target ? [[b.category === "petshop" ? "Pet" : "Veículo", b.target]] : []),
              ["Total ilustrativo", money(s.price)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-1.5 text-sm">
                <span className="text-[var(--mkt-muted)]">{k}</span>
                <strong className="text-right font-medium">{v}</strong>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              className={btnGold}
              onClick={() => {
                setDraft(null);
                setTab("agenda");
                workspaceRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }}
            >
              Ver na agenda <ArrowRight size={16} aria-hidden />
            </button>
            <button type="button" className={btnLine} onClick={() => openBooking()}>
              Fazer outro agendamento
            </button>
          </div>
          <p className="mx-auto mt-4 max-w-sm text-[11px] text-[var(--mkt-muted)]">
            Esta confirmação existe apenas na simulação. Nenhum estabelecimento foi contatado.
          </p>
        </div>
      );
    }

    const c = getCat(draft.category);
    const svc = draft.service ? serviceById(draft.service) : undefined;
    const pro = draft.professional ? proById(draft.professional) : undefined;
    const labels = ["Serviço", "Profissional", "Data e hora", "Confirmação"];
    const canNext = draft.step === 1 ? !!draft.service : draft.step === 2 ? !!draft.professional : draft.step === 3 ? !!draft.time : true;

    const choice = (selected: boolean) =>
      `flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
        selected
          ? "border-[var(--mkt-accent-2)] bg-[color-mix(in_srgb,var(--mkt-accent-2)_12%,var(--mkt-surface))] shadow-[0_0_0_1px_var(--mkt-accent-2)]"
          : "border-[var(--mkt-border)] bg-[var(--mkt-surface)] hover:border-[var(--mkt-accent-2)]"
      }`;

    return (
      <div>
        <ol className="mb-6 flex items-center gap-2 text-[11px]" aria-label="Etapas do agendamento">
          {labels.map((label, i) => {
            const n = i + 1;
            const current = draft.step === n;
            const done = draft.step > n;
            return (
              <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    current
                      ? "border-[var(--mkt-accent-2)] bg-[var(--mkt-accent-2)] text-white"
                      : done
                        ? "border-[var(--mkt-accent-3)] bg-[var(--mkt-accent-3)] text-white"
                        : "border-[var(--mkt-border)] text-[var(--mkt-muted)]"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`hidden sm:inline ${current ? "font-semibold text-[var(--mkt-ink)]" : "text-[var(--mkt-muted)]"}`}>{label}</span>
                {i < labels.length - 1 && <span aria-hidden className="h-px flex-1 bg-[var(--mkt-border)]" />}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-6 md:grid-cols-[1fr_15rem]">
          <div>
            {draft.step === 1 && (
              <>
                <h3 className="font-display text-2xl font-semibold">O que vamos cuidar hoje?</h3>
                <p className="mb-4 mt-1 text-sm text-[var(--mkt-muted)]">Escolha o serviço. O preço fica claro desde o início.</p>
                <label className="mb-1.5 block text-xs font-semibold" htmlFor="sim-booking-category">
                  Categoria
                </label>
                <select
                  id="sim-booking-category"
                  className={fieldCls}
                  value={c.id}
                  onChange={(e) => patchDraft({ category: e.target.value, service: null, professional: null, time: null, target: "" })}
                >
                  {CATALOG.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 grid gap-2.5">
                  {c.services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={s.id === draft.service}
                      className={choice(s.id === draft.service)}
                      onClick={() => patchDraft({ service: s.id, professional: null, time: null })}
                    >
                      <div className="flex-1">
                        <strong className="block text-sm">{s.name}</strong>
                        <small className="text-xs text-[var(--mkt-muted)]">{s.duration} minutos</small>
                      </div>
                      <span className="text-sm font-semibold [font-variant-numeric:tabular-nums]">{money(s.price)}</span>
                      <span
                        aria-hidden
                        className={`flex size-5 items-center justify-center rounded-full border text-[10px] text-white ${s.id === draft.service ? "border-[var(--mkt-accent-2)] bg-[var(--mkt-accent-2)]" : "border-[var(--mkt-border)]"}`}
                      >
                        {s.id === draft.service ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {draft.step === 2 && (
              <>
                <h3 className="font-display text-2xl font-semibold">Quem vai cuidar de você?</h3>
                <p className="mb-4 mt-1 text-sm text-[var(--mkt-muted)]">Profissionais de exemplo do {c.business}.</p>
                <div className="grid gap-2.5">
                  {c.pros.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={p.id === draft.professional}
                      className={choice(p.id === draft.professional)}
                      onClick={() => patchDraft({ professional: p.id, time: null })}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--mkt-surface-2)] text-sm font-bold text-[var(--mkt-accent)]">
                        {initials(p.name)}
                      </span>
                      <div className="flex-1">
                        <strong className="block text-sm">{p.name}</strong>
                        <small className="text-xs text-[var(--mkt-muted)]">{p.role}</small>
                      </div>
                      <span
                        aria-hidden
                        className={`flex size-5 items-center justify-center rounded-full border text-[10px] text-white ${p.id === draft.professional ? "border-[var(--mkt-accent-2)] bg-[var(--mkt-accent-2)]" : "border-[var(--mkt-border)]"}`}
                      >
                        {p.id === draft.professional ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {draft.step === 3 && svc && (
              <>
                <h3 className="font-display text-2xl font-semibold">Encontre o melhor momento.</h3>
                <p className="mb-4 mt-1 text-sm text-[var(--mkt-muted)]">{svc.duration} minutos de atendimento.</p>
                <p className="mb-2 text-xs font-semibold">Selecione uma data</p>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Datas disponíveis">
                  {dates.map((d) => {
                    const dt = localDate(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={d === draft.date}
                        aria-label={fullDate(d)}
                        onClick={() => patchDraft({ date: d, time: null })}
                        className={`flex flex-col items-center rounded-xl border px-1 py-2 transition-all ${
                          d === draft.date
                            ? "border-[var(--mkt-accent-2)] bg-[color-mix(in_srgb,var(--mkt-accent-2)_14%,var(--mkt-surface))] text-[var(--mkt-accent)]"
                            : "border-[var(--mkt-border)] bg-[var(--mkt-surface)] hover:border-[var(--mkt-accent-2)]"
                        }`}
                      >
                        <small className="text-[10px] text-[var(--mkt-muted)]">{dt.toLocaleDateString("pt-BR", { weekday: "short" })}</small>
                        <strong className="font-display text-lg">{dt.getDate()}</strong>
                        <span className="text-[10px]">{dt.toLocaleDateString("pt-BR", { month: "short" })}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mb-2 mt-5 text-xs font-semibold">{dateLabel(draft.date)} · escolha um horário</p>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Horários disponíveis">
                  {Array.from({ length: 20 }, (_, i) => 540 + i * 30).map((m) => {
                    const t = timeLabel(m);
                    const enabled = isAvailable(bookings, today, draft.date, t, draft.professional, svc);
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={!enabled}
                        aria-pressed={t === draft.time}
                        onClick={() => patchDraft({ time: t })}
                        className={`rounded-lg border px-2 py-2 text-xs transition-all [font-variant-numeric:tabular-nums] ${
                          t === draft.time
                            ? "border-[var(--mkt-ink)] bg-[var(--mkt-ink)] text-[var(--mkt-bg)]"
                            : "border-[var(--mkt-border)] bg-[var(--mkt-surface)] hover:border-[var(--mkt-accent-2)]"
                        } disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 disabled:hover:border-[var(--mkt-border)]`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--mkt-muted)]">
                  <Info size={13} aria-hidden /> Horários riscados estão indisponíveis para este serviço.
                </p>
              </>
            )}

            {draft.step === 4 && svc && pro && draft.time && (
              <>
                <h3 className="font-display text-2xl font-semibold">Só falta confirmar.</h3>
                <p className="mb-4 mt-1 text-sm text-[var(--mkt-muted)]">Confira os detalhes do seu agendamento demonstrativo.</p>
                <label className="mb-1.5 block text-xs font-semibold" htmlFor="sim-customer">
                  Nome para o agendamento
                </label>
                <input
                  id="sim-customer"
                  className={fieldCls}
                  maxLength={60}
                  value={draft.customer}
                  autoComplete="off"
                  onChange={(e) => patchDraft({ customer: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-[var(--mkt-muted)]">Use um nome fictício para experimentar.</p>
                {(c.id === "petshop" || c.id === "automotiva") && (
                  <>
                    <label className="mb-1.5 mt-4 block text-xs font-semibold" htmlFor="sim-target">
                      {c.id === "petshop" ? "Nome do pet (opcional)" : "Modelo do veículo (opcional)"}
                    </label>
                    <input
                      id="sim-target"
                      className={fieldCls}
                      maxLength={50}
                      value={draft.target}
                      placeholder={c.id === "petshop" ? "Ex.: Mel" : "Ex.: carro de passeio"}
                      autoComplete="off"
                      onChange={(e) => patchDraft({ target: e.target.value })}
                    />
                  </>
                )}
                <dl className="mt-4 rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg)] p-4 text-sm">
                  {[
                    ["Serviço", svc.name],
                    ["Profissional", pro.name],
                    ["Data e horário", `${dateLabel(draft.date)} · ${draft.time}`],
                    ["Duração", `${svc.duration} minutos`],
                    ["Total", money(svc.price)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-1.5">
                      <dt className="text-[var(--mkt-muted)]">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--mkt-surface-2)] p-3 text-[11px] text-[var(--mkt-muted)]">
                  <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
                  Esta é uma simulação. O horário será incluído na agenda demonstrativa. Não há reserva real, cobrança ou envio de mensagens.
                </p>
                {formError && (
                  <p role="alert" className="mt-2 text-xs text-[#b32450]">
                    {formError}
                  </p>
                )}
              </>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg)] p-5 md:sticky md:top-2">
            <small className="text-[10px] font-bold tracking-widest text-[var(--mkt-muted)]">SEU MOMENTO, EM RESUMO</small>
            <h4 className="font-display mt-2 text-base font-semibold">{c.business}</h4>
            <div className="mt-4 flex items-start gap-2 text-xs text-[var(--mkt-muted)]">
              <c.icon size={15} className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <strong className="block font-medium text-[var(--mkt-ink)]">{svc ? svc.name : "Escolha um serviço"}</strong>
                {svc ? `${svc.duration} minutos` : c.name}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-[var(--mkt-muted)]">
              <User size={15} className="mt-0.5 shrink-0" aria-hidden />
              <strong className="font-medium text-[var(--mkt-ink)]">{pro ? pro.name : "Escolha o profissional"}</strong>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-[var(--mkt-muted)]">
              <Calendar size={15} className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <strong className="block font-medium text-[var(--mkt-ink)]">{dateLabel(draft.date)}</strong>
                {draft.time ?? "Horário a definir"}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--mkt-border)] pt-3 text-xs">
              <span>Total ilustrativo</span>
              <strong className="font-display text-xl [font-variant-numeric:tabular-nums]">{svc ? money(svc.price) : "—"}</strong>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--mkt-muted)]">Sem pagamento nesta demonstração. Estabelecimento e profissionais fictícios.</p>
          </aside>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--mkt-border)] pt-5">
          {draft.step > 1 ? (
            <button type="button" className={btnLine} onClick={() => patchDraft({ step: (draft.step - 1) as Draft["step"] })}>
              <ArrowLeft size={15} aria-hidden /> Voltar
            </button>
          ) : (
            <span className="text-xs text-[var(--mkt-muted)]">Etapa 1 de 4</span>
          )}
          <button
            type="button"
            className={btnGold}
            disabled={!canNext}
            onClick={() => (draft.step === 4 ? confirmBooking() : patchDraft({ step: (draft.step + 1) as Draft["step"] }))}
          >
            {draft.step === 4 ? "Confirmar agendamento" : "Continuar"}
            {draft.step === 4 ? <Check size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
          </button>
        </div>
      </div>
    );
  }

  const utilBooking = util && util.kind !== "reset" ? bookings.find((b) => b.id === util.id) : undefined;
  const utilService = utilBooking ? serviceById(utilBooking.service) : undefined;

  const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "caixa", label: "Caixa", icon: Wallet },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="space-y-16">
      {/* 1. O cliente escolhe */}
      <div>
        <p className="mb-5 flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--mkt-ink)] text-xs text-[var(--mkt-bg)]">1</span>
          O cliente escolhe e reserva
        </p>

        <div role="group" aria-label="Categorias de serviços" className="mb-6 flex flex-wrap gap-2">
          {CATALOG.map((c) => {
            const active = c.id === selectedCategory;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setBusinessCategory(c.id);
                  setProFilter("all");
                }}
                className={`sv-segment inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? "border-[var(--mkt-ink)] bg-[var(--mkt-ink)] text-[var(--mkt-bg)]"
                    : "border-[var(--mkt-border)] bg-[var(--mkt-surface)]"
                }`}
              >
                <c.icon size={16} strokeWidth={1.75} aria-hidden style={active ? undefined : { color: c.tone }} />
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-live="polite">
          <div className="relative min-h-56 overflow-hidden rounded-3xl border border-[var(--mkt-border)]" style={{ background: cat.tint }}>
            <Image
              key={cat.photo}
              src={`/marketing/servicos/sim/${cat.photo}.webp`}
              alt={`${cat.name} — imagem ilustrativa`}
              width={900}
              height={600}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="sv-fade-in h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgb(23_17_10/0.75)] to-transparent p-5 text-[var(--sv-cream)]">
              <p className="font-display text-xl font-semibold">{cat.business}</p>
              <p className="text-sm text-[var(--sv-cream)]/85">{cat.description}</p>
            </div>
          </div>

          <ul className="grid gap-3">
            {cat.services.map((s) => (
              <li
                key={s.id}
                className="sv-plan flex items-center gap-4 rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-5"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-[var(--mkt-muted)]">{s.description}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--mkt-muted)]">
                    <Clock size={12} aria-hidden /> {s.duration} min · valor ilustrativo
                  </p>
                </div>
                <div className="text-right">
                  <strong className="font-display block text-xl [font-variant-numeric:tabular-nums]">{money(s.price)}</strong>
                  <button type="button" className={`${btnGold} mt-2 !px-4 !py-2 text-xs`} onClick={() => openBooking(s.id)}>
                    Agendar <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. Você gerencia */}
      <div ref={workspaceRef} className="scroll-mt-24">
        <p className="mb-5 flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--mkt-ink)] text-xs text-[var(--mkt-bg)]">2</span>
          Você acompanha na gestão
        </p>

        <div className="overflow-hidden rounded-3xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] shadow-[0_30px_60px_-40px_rgb(70_45_10/0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mkt-border)] px-5 pt-3">
            <div role="tablist" aria-label="Visões de gestão" className="flex gap-5">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`sim-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="sim-panel"
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
                    e.preventDefault();
                    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
                    setTab(next.id);
                    document.getElementById(`sim-tab-${next.id}`)?.focus();
                  }}
                  className={`flex items-center gap-2 border-b-2 px-0.5 py-3 text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? "border-[var(--mkt-accent-2)] text-[var(--mkt-accent)]"
                      : "border-transparent text-[var(--mkt-muted)] hover:text-[var(--mkt-ink)]"
                  }`}
                >
                  <t.icon size={15} aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="pb-2">
              <label className="sr-only" htmlFor="sim-business">
                Segmento do negócio
              </label>
              <select
                id="sim-business"
                value={businessCategory}
                onChange={(e) => {
                  setBusinessCategory(e.target.value);
                  setProFilter("all");
                }}
                className={fieldSm}
              >
                {CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.business}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div id="sim-panel" role="tabpanel" aria-labelledby={`sim-tab-${tab}`} className="min-h-96 p-5 sm:p-7">
            {tab === "agenda" ? renderAgenda() : tab === "caixa" ? renderCash() : renderDashboard()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mkt-border)] bg-[var(--mkt-surface)] px-5 py-3 text-[11px] text-[var(--mkt-muted)]">
            <span className="flex items-center gap-2">
              <Info size={13} aria-hidden /> Faça um agendamento acima e veja a gestão se atualizar.
            </span>
            <button
              type="button"
              onClick={() => setUtil({ kind: "reset" })}
              className="flex items-center gap-1.5 font-medium transition-colors hover:text-[var(--mkt-ink)]"
            >
              Reiniciar demonstração <RotateCcw size={12} aria-hidden />
            </button>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs text-[var(--mkt-muted)]">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
          Ambiente demonstrativo. Os dados ficam apenas neste navegador. Nenhum pagamento ou mensagem é enviado.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--mkt-border)] pt-6">
          <Link href="/servicos" className={btnLine} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowLeft size={15} aria-hidden /> Voltar ao início
          </Link>
          <Link href="/servicos/planos" className={btnGold}>
            Ir para os planos <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Agendamento (modal) */}
      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.step === 5 ? "Agendamento confirmado" : "Seu próximo momento"} wide>
        {renderBookingBody()}
      </Modal>

      {/* Pagamento, cancelamento e reinício */}
      <Modal
        open={!!util}
        onClose={() => setUtil(null)}
        title={util?.kind === "pay" ? "Registrar recebimento" : util?.kind === "cancel" ? "Cancelar este horário?" : "Recomeçar a demonstração?"}
      >
        {util?.kind === "pay" && utilBooking && utilService && (
          <>
            <p className="text-sm text-[var(--mkt-muted)]">
              {utilBooking.customer} · {utilService.name}
              <br />
              Simulação de recebimento em {dateLabel(panelDate)}.
            </p>
            <p className="font-display my-4 text-3xl font-semibold [font-variant-numeric:tabular-nums]">{money(utilService.price)}</p>
            <div className="mb-5 flex gap-2" role="group" aria-label="Forma de pagamento">
              {["Pix", "Cartão", "Dinheiro"].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={util.method === m}
                  onClick={() => setUtil({ ...util, method: m })}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                    util.method === m
                      ? "border-[var(--mkt-accent-2)] bg-[color-mix(in_srgb,var(--mkt-accent-2)_14%,var(--mkt-surface))] text-[var(--mkt-accent)]"
                      : "border-[var(--mkt-border)] hover:border-[var(--mkt-accent-2)]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mb-5 text-xs text-[var(--mkt-muted)]">Nenhuma transação financeira será realizada.</p>
          </>
        )}
        {util?.kind === "cancel" && utilBooking && utilService && (
          <p className="mb-5 text-sm text-[var(--mkt-muted)]">
            {utilBooking.customer} · {utilService.name}
            <br />
            {dateLabel(utilBooking.date)} às {utilBooking.time}. O horário voltará a ficar disponível na demonstração.
          </p>
        )}
        {util?.kind === "reset" && (
          <p className="mb-5 text-sm text-[var(--mkt-muted)]">
            Os agendamentos e recebimentos criados neste navegador serão removidos. Os dados fictícios iniciais serão restaurados.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnLine} onClick={() => setUtil(null)}>
            {util?.kind === "cancel" ? "Manter" : util?.kind === "reset" ? "Manter meus testes" : "Voltar"}
          </button>
          <button type="button" className={btnGold} onClick={confirmUtil}>
            {util?.kind === "pay" ? "Confirmar recebimento" : util?.kind === "cancel" ? "Cancelar agendamento" : "Reiniciar"}
          </button>
        </div>
      </Modal>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-[70] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-[var(--sv-night)] px-5 py-3 text-center text-sm text-[var(--sv-cream)] shadow-2xl transition-all duration-300 ${
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {toast?.text}
      </div>
    </div>
  );
}
