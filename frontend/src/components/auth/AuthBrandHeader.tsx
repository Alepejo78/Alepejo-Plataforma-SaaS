import { systemConfig } from "@/config/system";

/**
 * Cabeçalho com logo + nome + tagline, usado nas telas de acesso que
 * ficam fora do AppShell (definir senha, esqueci senha) — mesma marca
 * que já aparece no e-mail de convite e no painel de `/login`.
 */
export function AuthBrandHeader() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={systemConfig.company.logo}
        alt={systemConfig.company.name}
        width={224}
        height={224}
        className="mb-2 h-56 w-56 object-contain"
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
