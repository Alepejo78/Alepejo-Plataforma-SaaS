"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { OsShell } from "@/components";
import { Can } from "@/components/auth/Can";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";
import { WhatsappSettingsTab } from "@/components/settings/WhatsappSettingsTab";

import {
  documentTemplateAssetUrl,
  documentTemplateSettingsService,
  type DocumentTemplateSettings,
} from "@/services/document-template-settings.service";

/**
 * Configuração de e-mail (SMTP por empresa) ocultada por decisão do
 * usuário (19-08-2026): a hospedagem atual (Railway, fora do plano
 * Pro) bloqueia a porta SMTP pra qualquer servidor, então o SMTP
 * customizado por empresa não funcionaria em produção mesmo
 * configurado certinho. `EmailSettingsTab` continua existindo — só
 * não é mais importado aqui — pra reativar fácil se um dia isso for
 * resolvido (upgrade de plano, ou trocar o recurso por chave de API
 * tipo Resend por empresa). Ver docs/08-Continuidade.md.
 */

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const textareaClass = `
  w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

function TemplateImageUploader({
  currentPath,
  onChanged,
}: {
  currentPath: string | null;
  onChanged: (settings: DocumentTemplateSettings) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError("");

    try {
      const updated =
        await documentTemplateSettingsService.uploadTemplateImage(file);
      onChanged(updated);
    } catch (err) {
      setError(extractMessage(err, "Não foi possível enviar o template."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError("");

    try {
      const updated =
        await documentTemplateSettingsService.removeTemplateImage();
      onChanged(updated);
    } catch (err) {
      setError(extractMessage(err, "Não foi possível remover o template."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-white">
          {currentPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={documentTemplateAssetUrl(currentPath) ?? undefined}
              alt="Template completo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="px-1 text-center text-[10px] text-[var(--text-muted)]">
              Sem template
            </span>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void handleFile(file);
              }

              e.target.value = "";
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
            >
              <Upload size={16} />
              {busy
                ? "Enviando..."
                : currentPath
                  ? "Trocar template"
                  : "Importar template"}
            </button>

            {currentPath && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove()}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] disabled:opacity-60"
              >
                <Trash2 size={16} />
                Remover
              </button>
            )}
          </div>

          <p className="max-w-md text-xs text-[var(--text-muted)]">
            Imagem PNG ou JPG de página inteira (A4), com o cabeçalho e
            o rodapé já desenhados — vira o fundo de todo PDF gerado,
            atrás do conteúdo. Deixe uma faixa em branco no meio da
            página pra não sobrepor o conteúdo.
          </p>

          {error && (
            <p className="text-xs text-[var(--danger)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PdfTemplateSection() {
  const [settings, setSettings] = useState<DocumentTemplateSettings | null>(
    null
  );
  const [pdfHeader, setPdfHeader] = useState("");
  const [pdfFooter, setPdfFooter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await documentTemplateSettingsService.get();

      setSettings(result);
      setPdfHeader(result.pdfHeader ?? "");
      setPdfFooter(result.pdfFooter ?? "");
    } catch (err) {
      setLoadError(
        extractMessage(err, "Não foi possível carregar as configurações.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setActionError("");
    setSaved(false);

    try {
      const updated = await documentTemplateSettingsService.update({
        pdfHeader,
        pdfFooter,
      });

      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-base font-bold text-[var(--text-primary)]">
        Cabeçalho e rodapé dos PDFs
      </h2>

      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Texto colado no topo e no fim de todo PDF gerado pelo sistema
        (orçamento, holerite, ordem de serviço) — aviso legal, dados
        adicionais da empresa etc. Deixe em branco pra não mostrar
        nada extra.
      </p>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
          <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
        </div>
      ) : loadError || !settings ? (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {loadError}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <p className={labelClass}>Template completo (opcional)</p>
            <TemplateImageUploader
              currentPath={settings.templateImagePath}
              onChanged={(updated) => {
                setSettings(updated);
                setSaved(false);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Cabeçalho (texto)</label>
              <textarea
                rows={3}
                className={textareaClass}
                value={pdfHeader}
                onChange={(e) => {
                  setPdfHeader(e.target.value);
                  setSaved(false);
                }}
              />
            </div>

            <div>
              <label className={labelClass}>Rodapé (texto)</label>
              <textarea
                rows={3}
                className={textareaClass}
                value={pdfFooter}
                onChange={(e) => {
                  setPdfFooter(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>

            {saved && (
              <p className="text-xs text-[var(--success)]">Salvo.</p>
            )}

            {actionError && (
              <p className="text-xs text-[var(--danger)]">{actionError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificacoesPage() {
  return (
    <PageAccessGuard permission={["whatsapp.view", "email.manage"]}>
      <OsShell workspaceLabel="Notificações">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Notificações
          </h1>

          <Can permission="whatsapp.view">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <WhatsappSettingsTab />
            </div>
          </Can>

          <Can permission="email.manage">
            <PdfTemplateSection />
          </Can>
        </div>
      </OsShell>
    </PageAccessGuard>
  );
}
