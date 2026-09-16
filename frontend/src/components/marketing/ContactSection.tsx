"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail, MapPin, MessageCircle } from "lucide-react";

import { contactService } from "@/services/contact.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const emptyForm = { name: "", email: "", phone: "", company: "", message: "" };

/**
 * "Fale com a gente" reaproveitável — mesmo endpoint/serviço do
 * institucional (`contactService`), pra toda página pública da
 * Assessoria (`/inicio`, `/servicos`, `/servicos/planos`) ter contato
 * sem duplicar o backend.
 */
export function ContactSection({
  title = "Fale com a gente",
  description = "Tem dúvida sobre os planos ou quer saber mais? Manda uma mensagem.",
}: {
  title?: string;
  description?: string;
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function setField(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await contactService.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        message: form.message.trim(),
      });

      setDone(true);
    } catch (err) {
      setError(extractMessage(err, "Não foi possível enviar sua mensagem."));
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = `
    h-11 w-full rounded-xl border border-[var(--border)]
    bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
    outline-none transition-colors
    focus:border-[var(--primary)]
  `;

  const labelClass = "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

  return (
    <section id="contato" className="border-t border-[var(--border)] py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">{title}</h2>

          <p className="mt-3 text-[var(--text-muted)]">{description}</p>

          <div className="mt-8 space-y-4 text-sm text-[var(--text-secondary)]">
            <a
              href="mailto:suporte@alepejo.com.br"
              className="flex items-center gap-3 hover:text-[var(--text-primary)]"
            >
              <Mail size={18} className="text-[var(--primary)]" />
              suporte@alepejo.com.br
            </a>

            <a
              href="https://wa.me/5543991544557"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-[var(--text-primary)]"
            >
              <MessageCircle size={18} className="text-[var(--primary)]" />
              (43) 9 9154-4557
            </a>

            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-[var(--primary)]" />
              Atendimento remoto ou presencial para todo o Brasil
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 size={32} className="text-[var(--success)]" />
              <p className="font-medium text-[var(--text-primary)]">Mensagem enviada!</p>
              <p className="text-sm text-[var(--text-muted)]">
                Vamos responder em breve no e-mail informado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="mkt-name">
                    Nome <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="mkt-name"
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="mkt-email">
                    E-mail <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    id="mkt-email"
                    type="email"
                    className={fieldClass}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="mkt-phone">
                    Telefone
                  </label>
                  <input
                    id="mkt-phone"
                    className={fieldClass}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="mkt-company">
                    Empresa
                  </label>
                  <input
                    id="mkt-company"
                    className={fieldClass}
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="mkt-message">
                    Mensagem <span className="text-[var(--danger)]">*</span>
                  </label>
                  <textarea
                    id="mkt-message"
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSubmit()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
