import { systemConfig } from "@/config/system";

/**
 * Cabeçalho com logo + nome + tagline, usado nas telas de acesso que
 * ficam fora do AppShell (definir senha, esqueci senha) — mesma marca
 * que já aparece no e-mail de convite e no painel de `/login`.
 *
 * Nas páginas públicas de confirmação (holerite, EPI), quem confirma
 * é o colaborador — faz mais sentido ele ver a marca do próprio
 * empregador (logo da empresa cadastrada em Personalização) do que a
 * marca do AlePejo ERP Cloud, que ele talvez nem conheça. Passando
 * `companyLogo`, o cabeçalho troca pra essa marca; sem ele (ou sem a
 * empresa ter personalizado a logo), mantém o formato atual.
 */
export function AuthBrandHeader({
  companyLogo,
  companyName,
}: {
  companyLogo?: string | null;
  companyName?: string | null;
} = {}) {
  if (companyLogo) {
    return (
      <div className="mb-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={companyLogo}
          alt={companyName ?? ""}
          width={224}
          height={142}
          className="mb-2 h-auto w-56 object-contain"
        />

        {companyName && (
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {companyName}
          </h1>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={systemConfig.company.logo}
        alt={systemConfig.company.name}
        width={224}
        height={142}
        className="mb-2 h-auto w-56 object-contain"
      />

      <h1 className="text-lg font-bold text-[var(--text-primary)]">
        {systemConfig.company.name} {systemConfig.systemName}
      </h1>

      <p className="text-xs text-[var(--text-muted)]">
        Gestão inteligente para empresas
      </p>
    </div>
  );
}
