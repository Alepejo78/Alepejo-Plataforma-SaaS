"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Layout,
  LayoutGrid,
  Lock,
  Monitor,
  PanelsTopLeft,
  UserRound,
  Upload,
} from "lucide-react";

import { OsShell } from "@/components";
import { useAuth } from "@/providers/AuthProvider";

import {
  brandingAssetUrl,
  companyBrandingService,
  type BrandingTheme,
  type CompanyBranding,
  type UpdateCompanyBrandingPayload,
} from "@/services/company-branding.service";
import { companyService } from "@/services/company.service";
import { profileService } from "@/services/profile.service";
import { brandPalette, parseHex } from "@/lib/brandColor";
import type { SidebarLayout } from "@/types/auth";

const SYSTEM_NAME_MAX_LENGTH = 40;

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

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary)]"
          : "border-[var(--border-strong)] bg-[var(--surface-hover)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/** Azul do sistema — ponto de partida quando a empresa ainda não escolheu. */
const DEFAULT_BRAND_COLOR = "#2563eb";

/**
 * Mostra como a cor escolhida fica de verdade: o botão com o texto por
 * cima e o fundo suave. É o que evita o cliente salvar um amarelo claro
 * e só descobrir depois que o texto sumiu.
 */
function BrandColorPreview({ hex }: { hex: string }) {
  const palette = brandPalette(hex);

  if (!palette) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-xl px-4 py-2.5 text-sm font-semibold"
        style={{
          background: palette.light["--primary"],
          color: palette.light["--primary-contrast"],
        }}
      >
        Exemplo
      </span>

      <span
        className="rounded-xl px-4 py-2.5 text-sm font-semibold"
        style={{
          background: palette.light["--primary-soft"],
          color: palette.light["--primary-text"],
        }}
      >
        Destaque
      </span>

      <span
        className="rounded-xl px-4 py-2.5 text-sm font-semibold"
        style={{
          background: palette.dark["--primary"],
          color: palette.dark["--primary-contrast"],
        }}
        title="Como fica no tema escuro"
      >
        Escuro
      </span>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {title}
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          label={title}
        />
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function LogoUploader({
  theme,
  currentLogo,
  onUploaded,
}: {
  theme: BrandingTheme;
  currentLogo: string | null;
  onUploaded: (branding: CompanyBranding) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const branding = await companyBrandingService.uploadLogo(
        theme,
        file
      );

      onUploaded(branding);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível enviar a logo.")
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] ${
            theme === "dark" ? "bg-[#0d1526]" : "bg-white"
          }`}
        >
          {currentLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandingAssetUrl(currentLogo) ?? undefined}
              alt="Logo enviada"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">
              Padrão
            </span>
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void handleFile(file);
              }

              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <Upload size={16} />
            {uploading ? "Enviando..." : "Enviar logo"}
          </button>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            PNG, JPG, WEBP ou SVG — até 2MB
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function AvatarUploader({
  currentAvatar,
  onUploaded,
}: {
  currentAvatar: string | null;
  onUploaded: (avatar: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");

    try {
      const result = await profileService.uploadAvatar(file);

      if (result.avatar) {
        onUploaded(result.avatar);
      }
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível enviar a foto.")
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-hover)]">
          {currentAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandingAssetUrl(currentAvatar) ?? undefined}
              alt="Foto enviada"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">
              Iniciais
            </span>
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void handleFile(file);
              }

              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <Upload size={16} />
            {uploading ? "Enviando..." : "Enviar foto"}
          </button>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            PNG, JPG ou WEBP — até 2MB
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

function ProfilePhotoSection() {
  const { refreshUser } = useAuth();

  const [avatar, setAvatar] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    profileService
      .get()
      .then((result) => {
        setAvatar(result.avatar);
        setEnabled(result.avatarEnabled);
      })
      .catch(() => {
        // Sem foto ainda: fica no padrão (iniciais).
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(value: boolean) {
    setUpdating(true);
    setError("");

    try {
      const result = await profileService.setEnabled(value);

      setEnabled(result.avatarEnabled);
      void refreshUser();
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
    );
  }

  return (
    <>
      <ToggleRow
        title="Minha foto"
        description="Usar a foto enviada no lugar das iniciais, no canto superior direito."
        checked={enabled}
        disabled={updating}
        onChange={(value) => void handleToggle(value)}
      >
        <AvatarUploader
          currentAvatar={avatar}
          onUploaded={(url) => {
            setAvatar(url);
            void refreshUser();
          }}
        />
      </ToggleRow>

      {error && (
        <p className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </>
  );
}

const SIDEBAR_LAYOUT_OPTIONS: {
  value: SidebarLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "vertical",
    label: "Vertical",
    description: "Menu na lateral esquerda (padrão atual).",
  },
  {
    value: "horizontal",
    label: "Horizontal",
    description: "Menu em barra no topo, estilo ribbon.",
  },
];

function BrandingSection() {
  const { user, refreshUser } = useAuth();

  const [branding, setBranding] = useState<CompanyBranding | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState("");

  const [systemName, setSystemName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [color, setColor] = useState(DEFAULT_BRAND_COLOR);
  const [savingColor, setSavingColor] = useState(false);
  const [colorSaved, setColorSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const result = await companyBrandingService.get();

      setBranding(result);
      // Campo livre, mas parte pré-preenchido com a Razão social da
      // empresa logada — só quando ainda não foi customizado, pra não
      // sobrescrever o que a empresa já escreveu ali.
      setSystemName(result.systemName || user?.company.legalName || "");
      setColor(result.brandColor || DEFAULT_BRAND_COLOR);
    } catch (err) {
      setLoadError(
        extractMessage(
          err,
          "Não foi possível carregar a personalização."
        )
      );
    } finally {
      setLoading(false);
    }
    // `user` só entra como valor padrão inicial (fallback pra Razão
    // social) — deps vazias de propósito, senão qualquer refresh de
    // `user` (outro toggle salvo na página) refaria essa chamada e
    // apagaria um nome ainda não salvo que a pessoa esteja digitando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function applyBranding(updated: CompanyBranding) {
    setBranding(updated);
    void refreshUser();
  }

  async function saveColor() {
    if (!parseHex(color)) {
      setActionError("Informe uma cor em hexadecimal, como #2563eb.");

      return;
    }

    setSavingColor(true);
    setActionError("");
    setColorSaved(false);

    try {
      const updated = await companyBrandingService.update({
        brandColor: color,
      });

      applyBranding(updated);
      setColorSaved(true);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar a cor.")
      );
    } finally {
      setSavingColor(false);
    }
  }

  async function saveToggle(patch: UpdateCompanyBrandingPayload) {
    setUpdating(true);
    setActionError("");

    try {
      const updated = await companyBrandingService.update(patch);

      applyBranding(updated);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setUpdating(false);
    }
  }

  async function saveSystemName() {
    setSavingName(true);
    setActionError("");
    setNameSaved(false);

    try {
      const updated = await companyBrandingService.update({
        systemName,
      });

      applyBranding(updated);
      setNameSaved(true);
    } catch (err) {
      setActionError(
        extractMessage(err, "Não foi possível salvar o nome.")
      );
    } finally {
      setSavingName(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
        <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
      </div>
    );
  }

  if (loadError || !branding) {
    return (
      <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
        {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-muted)]">
        Cada item abaixo tem sua própria chave: desligado, o
        sistema usa o padrão AlePejo naquele item, mesmo que já
        exista logo enviada ou nome salvo. Prepare o que quiser e
        só ligue quando estiver pronto.
      </p>

      <ToggleRow
        title="Cor do sistema"
        description="Usar a cor da sua marca no lugar do azul padrão, em botões, links e destaques."
        checked={branding.brandingColorEnabled}
        disabled={updating}
        onChange={(value) => void saveToggle({ colorEnabled: value })}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
              htmlFor="brandColor"
            >
              Cor principal
            </label>

            <div className="flex items-center gap-2">
              {/* Seletor nativo do sistema operacional: o cliente
                  escolhe no olho, sem precisar saber hexadecimal. */}
              <input
                id="brandColor"
                type="color"
                value={parseHex(color) ? color : "#2563eb"}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
              />

              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#2563eb"
                className="h-11 w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={savingColor}
            onClick={() => void saveColor()}
            className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {savingColor ? "Salvando..." : "Salvar"}
          </button>

          <BrandColorPreview hex={color} />
        </div>

        {colorSaved && (
          <p className="mt-2 text-xs text-[var(--success)]">
            Cor salva. Ligue a chave acima para o sistema passar a usá-la.
          </p>
        )}

        <p className="mt-2 text-xs text-[var(--text-muted)]">
          As variações (passar o mouse, fundos suaves e a cor do texto
          sobre a sua cor) são calculadas sozinhas, inclusive no tema
          escuro.
        </p>
      </ToggleRow>

      <ToggleRow
        title="Nome do sistema"
        description='Usar este nome no lugar de "AlePejo ERP Cloud".'
        checked={branding.brandingSystemNameEnabled}
        disabled={updating}
        onChange={(value) =>
          void saveToggle({ systemNameEnabled: value })
        }
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              className={fieldClass}
              placeholder="AlePejo ERP Cloud"
              maxLength={SYSTEM_NAME_MAX_LENGTH}
              value={systemName}
              onChange={(e) => {
                setSystemName(e.target.value);
                setNameSaved(false);
              }}
            />

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Nomes longos aparecem menores no menu para caber —
              {" "}
              {systemName.length}/{SYSTEM_NAME_MAX_LENGTH}{" "}
              caracteres.
            </p>
          </div>

          <button
            type="button"
            disabled={savingName}
            onClick={() => void saveSystemName()}
            className="h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {savingName ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {nameSaved && (
          <p className="mt-2 text-xs text-[var(--success)]">
            Nome salvo.
          </p>
        )}
      </ToggleRow>

      <ToggleRow
        title="Logo — tema claro"
        description="Usar a logo enviada quando o sistema estiver no tema claro."
        checked={branding.brandingLogoLightEnabled}
        disabled={updating}
        onChange={(value) =>
          void saveToggle({ logoLightEnabled: value })
        }
      >
        <LogoUploader
          theme="light"
          currentLogo={branding.logo}
          onUploaded={applyBranding}
        />
      </ToggleRow>

      <ToggleRow
        title="Logo — tema escuro"
        description="Usar a logo enviada quando o sistema estiver no tema escuro."
        checked={branding.brandingLogoDarkEnabled}
        disabled={updating}
        onChange={(value) =>
          void saveToggle({ logoDarkEnabled: value })
        }
      >
        <LogoUploader
          theme="dark"
          currentLogo={branding.logoDark}
          onUploaded={applyBranding}
        />
      </ToggleRow>

      <ToggleRow
        title="Botão de tema claro/escuro"
        description="Mostrar, no topo do sistema, o botão para os usuários alternarem entre claro e escuro."
        checked={branding.brandingThemeToggleEnabled}
        disabled={updating}
        onChange={(value) =>
          void saveToggle({ themeToggleEnabled: value })
        }
      />

      <div className="rounded-xl border border-[var(--border)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Layout do menu
        </p>

        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Escolha como o menu aparece para os usuários da empresa.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SIDEBAR_LAYOUT_OPTIONS.map((option) => {
            const Icon =
              option.value === "vertical" ? Layout : LayoutGrid;
            const selected =
              branding.sidebarLayout === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={updating}
                onClick={() =>
                  void saveToggle({ sidebarLayout: option.value })
                }
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                  selected
                    ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Icon
                  size={18}
                  className={
                    selected
                      ? "mt-0.5 shrink-0 text-[var(--primary-text)]"
                      : "mt-0.5 shrink-0 text-[var(--text-secondary)]"
                  }
                />

                <div>
                  <p
                    className={`text-sm font-medium ${
                      selected
                        ? "text-[var(--primary-text)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {option.label}
                  </p>

                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
          {actionError}
        </div>
      )}
    </div>
  );
}

function BrandingLocked() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
      <Lock size={18} className="mt-0.5 shrink-0" />

      <div>
        <p className="font-medium text-[var(--text-secondary)]">
          Módulo não contratado
        </p>

        <p className="mt-1">
          Com o módulo de Personalização, sua empresa pode usar
          logo e nome próprios no lugar dos padrões AlePejo, trocar
          o layout do menu e liberar o botão de tema claro/escuro
          para os usuários. Fale com o suporte para contratar.
        </p>
      </div>
    </div>
  );
}

const MIN_OPEN_TABS = 1;
const MAX_OPEN_TABS = 15;

function MaxOpenTabsSection() {
  const { user, refreshUser } = useAuth();

  const [value, setValue] = useState(
    String(user?.company.maxOpenTabs ?? 6)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const parsed = Number(value);
  const valid =
    Number.isInteger(parsed) &&
    parsed >= MIN_OPEN_TABS &&
    parsed <= MAX_OPEN_TABS;
  const changed = parsed !== (user?.company.maxOpenTabs ?? 6);

  async function handleSave() {
    if (!valid) {
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await companyService.updateMine({ maxOpenTabs: parsed });
      await refreshUser();

      setSaved(true);
    } catch (err) {
      setError(
        extractMessage(err, "Não foi possível salvar.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
          Guias abertas ao mesmo tempo
        </label>

        <p className="mb-2 max-w-md text-xs text-[var(--text-muted)]">
          Quantas telas cada usuário pode manter abertas ao mesmo
          tempo em cada app (Sistema ERP / OS), na barra de guias do
          topo.
        </p>

        <input
          type="number"
          min={MIN_OPEN_TABS}
          max={MAX_OPEN_TABS}
          className={`${fieldClass} w-28`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <button
        type="button"
        disabled={saving || !valid || !changed}
        onClick={() => void handleSave()}
        className="h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>

      {saved && (
        <span className="text-sm text-[var(--success)]">
          Salvo.
        </span>
      )}

      {error && (
        <span className="text-sm text-[var(--danger)]">
          {error}
        </span>
      )}
    </div>
  );
}

export default function PersonalizacaoPage() {
  const { hasModule } = useAuth();

  return (
    <OsShell workspaceLabel="Personalização">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Monitor
            size={22}
            className="text-[var(--text-secondary)]"
          />

          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Personalização
          </h1>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserRound
              size={18}
              className="text-[var(--text-secondary)]"
            />

            <h2 className="font-semibold text-[var(--text-primary)]">
              Minha conta
            </h2>
          </div>

          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Pessoal — vale só para o seu login, não depende de
            módulo contratado pela empresa.
          </p>

          <ProfilePhotoSection />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="mb-4 flex items-center gap-2">
            <PanelsTopLeft
              size={18}
              className="text-[var(--text-secondary)]"
            />

            <h2 className="font-semibold text-[var(--text-primary)]">
              Geral
            </h2>
          </div>

          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Da empresa — vale para todo mundo que usa o sistema aqui,
            não depende de módulo contratado.
          </p>

          <MaxOpenTabsSection />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 font-semibold text-[var(--text-primary)]">
            Da empresa
          </h2>

          {hasModule("BRANDING") ? (
            <BrandingSection />
          ) : (
            <BrandingLocked />
          )}
        </section>
      </div>
    </OsShell>
  );
}
