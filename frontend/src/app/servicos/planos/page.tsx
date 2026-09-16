import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ContactSection } from "@/components/marketing/ContactSection";
import "@/components/marketing/vibrant.css";

const NAV_LINKS = [
  { label: "Recursos", href: "/servicos#recursos" },
  { label: "Segmentos", href: "/servicos#segmentos" },
  { label: "Contato", href: "/servicos#contato" },
];

/**
 * Planos do AlePejo Serviços — vazio de propósito por enquanto. A
 * configuração de planos de verdade (preços, módulos) entra numa rodada
 * futura; até lá, essa tela só existe pra já ter o link funcionando e
 * pra deixar claro que "planos em breve" não é um erro de carregamento.
 */
export default function ServicosPlanosPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <MarketingNav links={NAV_LINKS} />

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="vibrant-bg pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-[0.12]"
        />

        <div className="relative mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Planos <span className="vibrant-text">em breve</span>
          </h1>

          <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8">
            <span className="vibrant-icon-badge flex h-12 w-12 items-center justify-center rounded-xl">
              <Clock size={22} />
            </span>

            <p className="font-semibold text-[var(--text-primary)]">
              Estamos finalizando os planos do AlePejo Serviços
            </p>

            <p className="text-sm text-[var(--text-muted)]">
              Em breve você vai poder escolher o plano ideal aqui mesmo. Por
              enquanto, fale com a gente que avaliamos a necessidade do seu
              negócio.
            </p>
          </div>

          <Link
            href="/servicos"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={15} />
            Voltar para o AlePejo Serviços
          </Link>
        </div>
      </div>

      <ContactSection
        title="Fale sobre os planos"
        description="Conta pra gente o que seu negócio precisa — avaliamos o plano ideal com você."
      />

      <MarketingFooter page="servicos-planos" />
    </div>
  );
}
