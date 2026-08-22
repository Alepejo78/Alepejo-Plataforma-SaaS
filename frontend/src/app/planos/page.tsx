"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Star,
  X,
} from "lucide-react";

import {
  companyOnboardingService,
  type PublicModule,
  type PublicPlan,
} from "@/services/company-onboarding.service";
import { PublicNav } from "@/components/marketing/PublicNav";
import { Faq } from "@/components/marketing/Faq";
import "@/components/marketing/aurora.css";

function num(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function money(value: string | number | null | undefined) {
  return num(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Mínimo pro sistema funcionar — sempre marcado, sem opção de desmarcar (mesma regra do backend, ver CompanyOnboardingService). */
const MINIMUM_MODULE_CODES = ["BPS", "PRODUCTS", "INVENTORY", "SALES", "PURCHASE"];

function CustomPlanModal({
  customPlanId,
  basePrice,
  billingCycle,
  onClose,
}: {
  customPlanId: string;
  /** Preço do Essencial — os módulos mínimos do Customizado são os mesmos dele, então o total parte daqui. */
  basePrice: { monthly: number; yearly: number };
  billingCycle: "MONTHLY" | "YEARLY";
  onClose: () => void;
}) {
  const router = useRouter();

  const [modules, setModules] = useState<PublicModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    companyOnboardingService
      .listPublicModules()
      .then((list) => {
        setModules(list);
        setSelected(
          new Set(
            list
              .filter((m) => MINIMUM_MODULE_CODES.includes(m.code))
              .map((m) => m.id)
          )
        );
      })
      .catch(() => setError("Não foi possível carregar os módulos."))
      .finally(() => setLoading(false));
  }, []);

  function toggle(mod: PublicModule) {
    if (MINIMUM_MODULE_CODES.includes(mod.code)) {
      return;
    }

    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(mod.id)) {
        next.delete(mod.id);
      } else {
        next.add(mod.id);
      }

      return next;
    });
  }

  const addOnsMonthly = modules
    .filter((m) => selected.has(m.id) && !MINIMUM_MODULE_CODES.includes(m.code))
    .reduce((sum, m) => sum + num(m.monthlyPrice), 0);

  const addOnsYearly = modules
    .filter((m) => selected.has(m.id) && !MINIMUM_MODULE_CODES.includes(m.code))
    .reduce((sum, m) => sum + num(m.yearlyPrice), 0);

  const totalMonthly = basePrice.monthly + addOnsMonthly;
  const totalYearly = basePrice.yearly + addOnsYearly;
  const totalSavings = totalMonthly * 12 - totalYearly;
  const displayTotal =
    billingCycle === "YEARLY" && totalYearly > 0 ? totalYearly / 12 : totalMonthly;

  function handleContinue(payNow: boolean) {
    const query = new URLSearchParams({
      planId: customPlanId,
      modules: Array.from(selected).join(","),
    });

    // Comprar agora paga ANTES de cadastrar (ver /checkout) — o teste
    // grátis continua indo direto pro cadastro.
    if (payNow) {
      query.set("cycle", billingCycle);
      router.push(`/checkout?${query.toString()}`);
      return;
    }

    router.push(`/cadastro-empresa?${query.toString()}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Monte seu plano
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Cadastros, Produtos, Estoque, Vendas e Compras vêm sempre
              incluídos — o mínimo pro sistema funcionar. Adicione o resto
              conforme sua empresa precisar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((mod) => {
                const isMinimum = MINIMUM_MODULE_CODES.includes(mod.code);
                const checked = selected.has(mod.id);

                return (
                  <label
                    key={mod.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                      checked
                        ? "border-[var(--primary)]"
                        : "border-[var(--border)]"
                    } ${isMinimum ? "opacity-80" : "cursor-pointer hover:border-[var(--border-strong)]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isMinimum}
                        onChange={() => toggle(mod)}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />

                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {mod.name}
                        </p>
                        {isMinimum && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Incluído
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                      {num(mod.monthlyPrice) > 0
                        ? `+ ${money(mod.monthlyPrice)}/mês`
                        : "Incluso"}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <div>
                <p className="text-xs text-[var(--text-muted)]">
                  Base (Cadastros, Produtos, Estoque, Vendas e Compras) +{" "}
                  {money(addOnsMonthly)} em módulos extras
                </p>

                {billingCycle === "MONTHLY" && totalSavings > 0 && (
                  <span className="mb-1 mt-1 inline-block rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--warning)]">
                    Economize {money(totalSavings)} no plano anual
                  </span>
                )}

                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {money(displayTotal)}
                  <span className="text-sm font-normal text-[var(--text-muted)]">
                    {" "}
                    /mês
                  </span>
                </p>

                {billingCycle === "YEARLY" && totalYearly > 0 && (
                  <p className="text-sm text-[var(--text-muted)]">
                    cobrado {money(totalYearly)}/ano
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => handleContinue(false)}
                  className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)]"
                >
                  Continuar com {selected.size} módulo(s)
                </button>

                <button
                  type="button"
                  onClick={() => handleContinue(true)}
                  className="text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
                >
                  Comprar agora
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PlanosPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [trialDays, setTrialDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY"
  );

  /*
   * Os planos ficam numa faixa única que rola de lado, com setas — em
   * grade eles quebravam de linha assim que passavam de três, e a
   * comparação entre eles ficava picotada. As setas só aparecem quando
   * há mesmo o que rolar.
   */
  const faixa = useRef<HTMLDivElement>(null);
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  const atualizarSetas = useCallback(() => {
    const el = faixa.current;

    if (!el) {
      return;
    }

    setPodeVoltar(el.scrollLeft > 8);
    setPodeAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  function rolar(direcao: 1 | -1) {
    const el = faixa.current;

    if (!el) {
      return;
    }

    // Anda de cartão em cartão: rolar por "uma tela" pularia planos
    // no meio do caminho quando cabem dois e meio na largura.
    const cartao = el.querySelector<HTMLElement>("[data-plano]");
    const passo = cartao ? cartao.offsetWidth + 24 : el.clientWidth * 0.8;

    el.scrollBy({ left: passo * direcao, behavior: "smooth" });

    // Reconfere as setas quando a rolagem suave termina. O `onScroll`
    // normalmente já dá conta, mas depender só dele deixaria a seta
    // acesa no fim da faixa se algum evento se perder no caminho.
    setTimeout(atualizarSetas, 450);
  }

  useEffect(() => {
    function carregar() {
      companyOnboardingService
        .listPublicPlans()
        .then(setPlans)
        .catch(() =>
          setError("Não foi possível carregar os planos. Tente novamente.")
        )
        .finally(() => setLoading(false));

      companyOnboardingService
        .getPublicTrialDays()
        .then(setTrialDays)
        .catch(() => {});
    }

    carregar();

    /*
     * Recarrega ao voltar pra aba. Quem administra os planos costuma
     * deixar esta página aberta num monitor e o painel no outro —
     * sem isso a página segura o preço antigo até alguém dar F5, e
     * parece que a alteração não foi salva.
     */
    function aoVoltar() {
      if (document.visibilityState === "visible") {
        carregar();
      }
    }

    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", carregar);

    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", carregar);
    };
  }, []);

  // Depois que os planos chegam (ou a janela muda de tamanho) a faixa
  // passa a ter largura de verdade — só aí dá pra saber se há o que
  // rolar e, portanto, se as setas devem aparecer.
  useEffect(() => {
    atualizarSetas();

    window.addEventListener("resize", atualizarSetas);

    return () => window.removeEventListener("resize", atualizarSetas);
  }, [plans, loading, atualizarSetas]);

  const sortedPlans = [...plans]
    .filter((p) => p.code !== "ENTERPRISE" && p.code !== "CUSTOM")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const customPlan = plans.find((p) => p.code === "CUSTOM");

  /*
   * O montador parte do plano de entrada, que já traz os módulos
   * mínimos (Cadastros, Produtos, Estoque, Vendas e Compras) — a partir
   * dele só somam os extras. É o BASICO; ESSENCIAL fica de reserva pra
   * quem ainda não criou o Básico no catálogo. Mesma regra do backend
   * (`CUSTOM_PLAN_BASE_CODES` em billing.service.ts): se as duas pontas
   * discordarem, a tela mostra um preço e a cobrança sai outro.
   */
  const planoBase =
    plans.find((p) => p.code === "BASICO") ??
    plans.find((p) => p.code === "ESSENCIAL");

  const customBasePrice = {
    monthly: num(planoBase?.monthlyPrice),
    yearly: num(planoBase?.yearlyPrice),
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div
        aria-hidden
        className="aurora-bg pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-[0.14]"
      />

      <PublicNav hidePlanosLink />

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Escolha o <span className="aurora-text">plano</span> do seu
            negócio
          </h1>

          <p className="mt-3 text-[var(--text-muted)]">
            {trialDays} dia{trialDays === 1 ? "" : "s"} grátis pra testar,
            sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        {!loading && !error && (
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("YEARLY")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  billingCycle === "YEARLY"
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Pago anualmente
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  billingCycle === "MONTHLY"
                    ? "bg-[var(--primary)] text-[var(--primary-contrast)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                Pago mensalmente
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-center text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="relative">
            <button
              type="button"
              onClick={() => rolar(-1)}
              aria-label="Ver planos anteriores"
              className={`absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-lg transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] md:flex ${
                podeVoltar ? "" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={() => rolar(1)}
              aria-label="Ver próximos planos"
              className={`absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-lg transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] md:flex ${
                podeAvancar ? "" : "pointer-events-none opacity-0"
              }`}
            >
              <ChevronRight size={22} />
            </button>

            {/* `pt-5` dá espaço pro selo "Mais escolhido", que fica pra
                fora do cartão e seria cortado pelo overflow da faixa. */}
            <div
              ref={faixa}
              onScroll={atualizarSetas}
              /* `snap-proximity`, não `mandatory`: quando sobra menos de
                 um cartão de rolagem, o encaixe obrigatório não acha
                 ponto válido pra frente e joga a faixa de volta pro
                 começo — as setas paravam de funcionar. */
              className="faixa-planos flex snap-x snap-proximity gap-6 overflow-x-auto scroll-smooth px-1 pb-4 pt-5"
            >
            {sortedPlans.map((plan) => {
              const planMonthly = num(plan.monthlyPrice);
              const planYearly = num(plan.yearlyPrice);
              const planSavings = planMonthly * 12 - planYearly;
              const displayPrice =
                billingCycle === "YEARLY" && planYearly > 0
                  ? planYearly / 12
                  : planMonthly;

              return (
              <div
                key={plan.id}
                data-plano
                className={`relative flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border bg-[var(--surface)] p-6 sm:w-[300px] ${
                  plan.highlighted
                    ? "border-transparent shadow-2xl shadow-[color:rgb(124_58_237_/_0.25)] ring-2 ring-[#7c3aed]/40"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="aurora-banner absolute -top-3 left-6 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
                    <Star size={12} />
                    Mais escolhido
                  </span>
                )}

                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {plan.name}
                </h2>

                {plan.description && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {plan.description}
                  </p>
                )}

                <div className="mt-4">
                  {billingCycle === "MONTHLY" && planSavings > 0 && (
                    <span className="mb-2 inline-block rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--warning)]">
                      Economize {money(planSavings)} no plano anual
                    </span>
                  )}

                  <p className="text-3xl font-bold text-[var(--text-primary)]">
                    {money(displayPrice)}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      {" "}
                      /mês
                    </span>
                  </p>

                  {billingCycle === "YEARLY" && planYearly > 0 ? (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      cobrado {money(planYearly)}/ano
                    </p>
                  ) : (
                    planYearly > 0 && (
                      <button
                        type="button"
                        onClick={() => setBillingCycle("YEARLY")}
                        className="mt-1 text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        Ou pague {money(planYearly)}/ano →
                      </button>
                    )
                  )}

                  {num(plan.setupFee) > 0 && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      + {money(plan.setupFee)} taxa de implantação
                    </p>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {(plan.planModules ?? [])
                    .filter((pm) => pm.included)
                    .map((pm) => (
                      <li
                        key={pm.module.id}
                        className="flex items-center gap-2 text-[var(--text-secondary)]"
                      >
                        <Check
                          size={16}
                          className="shrink-0 text-[var(--success)]"
                        />
                        {pm.module.name}
                      </li>
                    ))}
                </ul>

                <div className="mt-6 flex flex-col gap-2">
                  <Link
                    href={`/cadastro-empresa?planId=${plan.id}`}
                    className={`rounded-xl px-4 py-3 text-center text-sm font-semibold transition-transform ${
                      plan.highlighted
                        ? "aurora-banner text-white shadow-md hover:scale-[1.02]"
                        : "border border-[var(--border)] text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    Começar teste de {trialDays} dia
                    {trialDays === 1 ? "" : "s"}
                  </Link>

                  <Link
                    href={`/checkout?planId=${plan.id}&cycle=${billingCycle}`}
                    className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
                  >
                    Comprar agora
                  </Link>
                </div>
              </div>
              );
            })}
            </div>
          </div>
        )}

        {!loading && !error && customPlan && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] p-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[var(--primary)]/10 p-2.5 text-[var(--primary)]">
                <Sliders size={20} />
              </span>

              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  Customizado
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Não se encaixou nos planos acima? Monte o seu escolhendo
                  só os módulos que precisa.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="shrink-0 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            >
              Montar meu plano
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-[var(--text-muted)]">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--text-primary)] hover:underline"
          >
            Entrar
          </Link>
        </p>

        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          <Link href="/privacidade" className="hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </div>

      <Faq contactHref="/institucional#contato" />

      {customOpen && customPlan && (
        <CustomPlanModal
          customPlanId={customPlan.id}
          basePrice={customBasePrice}
          billingCycle={billingCycle}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </div>
  );
}
