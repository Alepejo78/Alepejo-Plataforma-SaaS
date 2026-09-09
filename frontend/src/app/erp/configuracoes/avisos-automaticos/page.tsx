"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

import { OsShell } from "@/components";
import { PageAccessGuard } from "@/components/auth/PageAccessGuard";

import {
  scheduledNotificationSettingsService,
  type ScheduledNotificationSettings,
  type ScheduledNotificationSettingsPayload,
} from "@/services/scheduled-notification-settings.service";

function extractMessage(err: unknown, fallback: string) {
  const message = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

const fieldClass = `
  h-11 w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const textareaClass = `
  w-full rounded-xl border border-[var(--border)]
  bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]
  outline-none transition-colors focus:border-[var(--primary)]
`;

const labelClass =
  "mb-1 block text-sm font-medium text-[var(--text-secondary)]";

type SubjectKey = Extract<
  keyof ScheduledNotificationSettings,
  `${string}Subject`
>;
type MessageKey = Extract<
  keyof ScheduledNotificationSettings,
  `${string}Message`
>;

interface NotificationTypeConfig {
  title: string;
  description: string;
  subjectKey: SubjectKey;
  messageKey: MessageKey;
  subjectDefault: string;
  messageDefault: string;
  placeholders: string[];
}

const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
  {
    title: "Lembrete de exame ocupacional",
    description:
      "Colaborador com exame perto de vencer — 7 dias antes (ou o prazo cadastrado nele), 3 dias antes e no dia.",
    subjectKey: "examReminderSubject",
    messageKey: "examReminderMessage",
    subjectDefault: "Lembrete de exame ocupacional — {{empresa}}",
    messageDefault:
      "Olá, {{nome}}! Seu exame ocupacional está marcado para {{data}} (em {{dias}} dia(s)). Não esqueça!",
    placeholders: ["nome", "empresa", "data", "dias"],
  },
  {
    title: "Aniversário",
    description: "Todo colaborador ativo, no dia do próprio aniversário.",
    subjectKey: "birthdaySubject",
    messageKey: "birthdayMessage",
    subjectDefault: "Feliz aniversário! 🎉",
    messageDefault:
      "Feliz aniversário, {{nome}}! Toda a equipe da {{empresa}} deseja um ótimo dia!",
    placeholders: ["nome", "empresa"],
  },
  {
    title: "Fechamento do banco de horas",
    description:
      "Colaborador com banco de horas ativo, a partir de X dias antes do fechamento (configurável em Configurações da Folha).",
    subjectKey: "hourBankClosingSubject",
    messageKey: "hourBankClosingMessage",
    subjectDefault: "Fechamento do banco de horas — {{empresa}}",
    messageDefault:
      "Olá, {{nome}}! Seu banco de horas fecha em {{data}} (em {{dias}} dia(s)).",
    placeholders: ["nome", "empresa", "data", "dias"],
  },
  {
    title: "Regularização de ponto",
    description:
      "Todo colaborador ativo, nos últimos dias do mês (configurável em Configurações da Folha), enquanto a folha daquela competência não existir.",
    subjectKey: "pointClosingSubject",
    messageKey: "pointClosingMessage",
    subjectDefault: "Regularize seu ponto — {{empresa}}",
    messageDefault:
      "Olá, {{nome}}! O mês de ponto está fechando — regularize suas batidas antes do fechamento.",
    placeholders: ["nome", "empresa"],
  },
  {
    title: "Lembrete de vencimento",
    description:
      "Cliente com título a receber perto de vencer (configurável em Lembrete de Vencimento).",
    subjectKey: "paymentReminderBeforeSubject",
    messageKey: "paymentReminderBeforeMessage",
    subjectDefault: "Lembrete de vencimento — {{empresa}}",
    messageDefault:
      "Olá, {{nome}}! Sua conta de {{valor}} com {{empresa}} vence em {{data}} (em {{dias}} dia(s)).",
    placeholders: ["nome", "empresa", "valor", "data", "dias"],
  },
  {
    title: "Conta vencida",
    description:
      "Cliente com título a receber vencido há alguns dias (configurável em Lembrete de Vencimento).",
    subjectKey: "paymentReminderOverdueSubject",
    messageKey: "paymentReminderOverdueMessage",
    subjectDefault: "Conta em atraso — {{empresa}}",
    messageDefault:
      "Olá, {{nome}}! Sua conta de {{valor}} com {{empresa}} venceu em {{data}} e ainda está em aberto.",
    placeholders: ["nome", "empresa", "valor", "data", "dias"],
  },
];

type FormState = Record<SubjectKey | MessageKey, string> & {
  announcementHeader: string;
  announcementFooter: string;
};

const emptyForm: FormState = {
  announcementHeader: "",
  announcementFooter: "",
  examReminderSubject: "",
  examReminderMessage: "",
  birthdaySubject: "",
  birthdayMessage: "",
  hourBankClosingSubject: "",
  hourBankClosingMessage: "",
  pointClosingSubject: "",
  pointClosingMessage: "",
  paymentReminderBeforeSubject: "",
  paymentReminderBeforeMessage: "",
  paymentReminderOverdueSubject: "",
  paymentReminderOverdueMessage: "",
};

function toForm(settings: ScheduledNotificationSettings): FormState {
  return {
    announcementHeader: settings.announcementHeader ?? "",
    announcementFooter: settings.announcementFooter ?? "",
    examReminderSubject: settings.examReminderSubject ?? "",
    examReminderMessage: settings.examReminderMessage ?? "",
    birthdaySubject: settings.birthdaySubject ?? "",
    birthdayMessage: settings.birthdayMessage ?? "",
    hourBankClosingSubject: settings.hourBankClosingSubject ?? "",
    hourBankClosingMessage: settings.hourBankClosingMessage ?? "",
    pointClosingSubject: settings.pointClosingSubject ?? "",
    pointClosingMessage: settings.pointClosingMessage ?? "",
    paymentReminderBeforeSubject:
      settings.paymentReminderBeforeSubject ?? "",
    paymentReminderBeforeMessage:
      settings.paymentReminderBeforeMessage ?? "",
    paymentReminderOverdueSubject:
      settings.paymentReminderOverdueSubject ?? "",
    paymentReminderOverdueMessage:
      settings.paymentReminderOverdueMessage ?? "",
  };
}

export default function AvisosAutomaticosPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await scheduledNotificationSettingsService.get();
      setForm(toForm(result));
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

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setActionError("");
    setSaved(false);

    try {
      const payload: ScheduledNotificationSettingsPayload = { ...form };
      const updated =
        await scheduledNotificationSettingsService.update(payload);

      setForm(toForm(updated));
      setSaved(true);
    } catch (err) {
      setActionError(extractMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageAccessGuard permission="scheduled-notifications.manage">
      <OsShell workspaceLabel="Avisos automáticos">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <div>
            <Link
              href="/os/seguranca"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft size={16} />
              Segurança
            </Link>

            <div className="flex items-center gap-2">
              <Bell size={22} className="text-[var(--text-secondary)]" />

              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Avisos automáticos
              </h1>
            </div>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Texto enviado por e-mail e WhatsApp em cada aviso que o
              sistema dispara sozinho. Deixe em branco pra usar o texto
              padrão do sistema.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-[var(--surface-hover)]"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
              {loadError}
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Cabeçalho e rodapé
                </h2>

                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Colado automaticamente em cima e embaixo de qualquer
                  aviso enviado abaixo — assinatura, aviso legal etc.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Cabeçalho</label>
                    <textarea
                      rows={2}
                      className={textareaClass}
                      value={form.announcementHeader}
                      onChange={(e) =>
                        updateField("announcementHeader", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Rodapé</label>
                    <textarea
                      rows={2}
                      className={textareaClass}
                      value={form.announcementFooter}
                      onChange={(e) =>
                        updateField("announcementFooter", e.target.value)
                      }
                    />
                  </div>
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                {NOTIFICATION_TYPES.map((type) => (
                  <section
                    key={type.messageKey}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
                  >
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      {type.title}
                    </h2>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {type.description}
                    </p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className={labelClass}>
                          Assunto (e-mail)
                        </label>
                        <input
                          className={fieldClass}
                          placeholder={type.subjectDefault}
                          value={form[type.subjectKey]}
                          onChange={(e) =>
                            updateField(type.subjectKey, e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Mensagem</label>
                        <textarea
                          rows={3}
                          className={textareaClass}
                          placeholder={type.messageDefault}
                          value={form[type.messageKey]}
                          onChange={(e) =>
                            updateField(type.messageKey, e.target.value)
                          }
                        />
                      </div>

                      <p className="text-xs text-[var(--text-muted)]">
                        Use:{" "}
                        {type.placeholders
                          .map((p) => `{{${p}}}`)
                          .join(", ")}
                      </p>
                    </div>
                  </section>
                ))}
              </div>

              <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
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
                  <p className="text-xs text-[var(--danger)]">
                    {actionError}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </OsShell>
    </PageAccessGuard>
  );
}
