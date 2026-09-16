"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function hasAcceptedExtension(filename: string) {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * "Trabalhe conosco" — e-mail + currículo, enviado por uma rota própria
 * do Next (`/api/trabalhe-conosco`, ver route.ts ao lado) direto pro
 * Resend, sem passar pelo backend NestJS do ERP (fora do escopo desta
 * rodada, que é só a parte da página).
 */
export function WorkWithUs() {
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (!hasAcceptedExtension(selected.name)) {
      setError("Envie o currículo em PDF, DOC ou DOCX.");
      e.target.value = "";
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_BYTES) {
      setError("O arquivo do currículo deve ter até 5 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setError("");
    setFile(selected);
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!file) {
      setError("Anexe o seu currículo.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("curriculo", file);

      const response = await fetch("/api/trabalhe-conosco", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "Não foi possível enviar seu currículo.");
      }

      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível enviar seu currículo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-[var(--mkt-bg-alt)] py-16">
      <div className="mx-auto max-w-md px-6">
        <div className="mkt-panel p-6">
          {done ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 size={32} className="text-[var(--mkt-accent-3)]" />
              <p className="font-medium text-[var(--mkt-ink)]">Currículo enviado!</p>
              <p className="text-sm text-[var(--mkt-muted)]">
                Obrigado pelo interesse — vamos guardar seu contato.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-[var(--mkt-muted)]"
                  htmlFor="trabalhe-email"
                >
                  Seu e-mail <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  id="trabalhe-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] px-3 text-sm text-[var(--mkt-ink)] outline-none transition-colors focus:border-[var(--mkt-accent)]"
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-[var(--mkt-muted)]"
                  htmlFor="trabalhe-curriculo"
                >
                  Currículo (PDF, DOC ou DOCX) <span className="text-[var(--danger)]">*</span>
                </label>

                <label
                  htmlFor="trabalhe-curriculo"
                  className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--mkt-border)] bg-[var(--mkt-bg-alt)] px-3 text-sm text-[var(--mkt-muted)] transition-colors hover:border-[var(--mkt-accent)]"
                >
                  <FileUp size={16} className="shrink-0 text-[var(--mkt-accent)]" />
                  <span className="truncate">
                    {file ? file.name : "Escolher arquivo"}
                  </span>
                </label>

                <input
                  id="trabalhe-curriculo"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,var(--mkt-accent),var(--mkt-accent-2))] px-5 py-3 text-sm font-semibold text-[var(--mkt-contrast)] transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Enviando..." : "Enviar currículo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
