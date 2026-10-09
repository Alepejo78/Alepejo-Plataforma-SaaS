"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const linkBioUrl = process.env.NEXT_PUBLIC_LINK_BIOS_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3003/links/criar" : "https://apps.alepejo.com.br/links/criar");

const products = [
  { name: "AlePejo ERP", href: "https://www.alepejo.com.br/institucional", pt: "Gestão da empresa: estoque, compras, vendas, financeiro e equipe em um só lugar.", en: "Business management: inventory, purchasing, sales, finances and your team in one place." },
  { name: "AlePejo Serviços", href: "https://www.alepejo.com.br/servicos", pt: "Agendamento online, atendimento e gestão de clientes para negócios de serviços.", en: "Online scheduling, customer service and client management for service businesses." },
  { name: "AlePejo WEBSITE", href: "https://apps.alepejo.com.br/servicositweb", pt: "Criação de sites para apresentar sua empresa, seus serviços e seus contatos na web.", en: "Websites to present your company, services and contact information online." },
  { name: "AlePejo FINANPESS", href: "https://apps.alepejo.com.br/finanpess", pt: "Controle financeiro pessoal para organizar receitas, despesas e acompanhar seu dinheiro.", en: "Personal finance management to organize income, expenses and track your money." },
  { name: "AlePejo - Criar seu próprio link para BIOs", href: linkBioUrl, pt: "Crie sua própria página de links para BIO. Reúna seus contatos, redes sociais e conteúdos em um único endereço.", en: "AlePejo lets you create your own bio link page. Bring contacts, social networks and content together at one address." },
];

export function ProductsMenu() {
  const { locale } = useLanguage();
  const english = locale === "en-US";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pinnedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) { pinnedRef.current = false; setOpen(false); }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !pinnedRef.current && !rootRef.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { pinnedRef.current = false; setOpen(false); } }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          pinnedRef.current = false;
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { pinnedRef.current = !pinnedRef.current; setOpen(pinnedRef.current); }}
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-[var(--mkt-ink)] transition-colors hover:bg-[var(--mkt-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]"
      >
        {english ? "Products" : "Produtos"}
        <ChevronDown size={15} aria-hidden className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full px-4 pb-4 pt-2 sm:px-6">
          <nav id={panelId} aria-label={english ? "AlePejo products" : "Produtos AlePejo"} className="mx-auto max-h-[calc(100dvh-6rem)] max-w-4xl overflow-y-auto rounded-2xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] p-3 shadow-xl sm:p-5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link key={product.name} href={product.href} onClick={() => { pinnedRef.current = false; setOpen(false); }} className="rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-4 transition-colors hover:border-[var(--mkt-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]">
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--mkt-ink)]">{product.name}<ArrowRight size={15} aria-hidden /></span>
                  <span className="mt-2 block text-xs leading-relaxed text-[var(--mkt-muted)]">{english ? product.en : product.pt}</span>
                </Link>
              ))}
            </div>
            <Link href="https://apps.alepejo.com.br/alepejo-agendamentos" onClick={() => { pinnedRef.current = false; setOpen(false); }} className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[var(--mkt-ink)] px-4 py-3 text-sm font-semibold text-[var(--mkt-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mkt-accent)]">
              {english ? "Try online scheduling now" : "Teste agora mesmo um agendamento Online"}<ArrowRight size={17} aria-hidden />
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
