export interface ServicosPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  highlighted: boolean;
}

interface ServicosPublicPlansResponse {
  plans: ServicosPlan[];
  trialDays: number;
}

/**
 * Catálogo público do AlePejoServiços (produto irmão) — chamado sem
 * sessão via rewrite `/api-servicos/*` (ver next.config.ts), então
 * fetch simples basta, sem o `api` axios (esse é do backend do ERP).
 */
export async function getServicosPublicPlans(): Promise<ServicosPublicPlansResponse> {
  const res = await fetch("/api-servicos/platform/plans/public");

  if (!res.ok) {
    throw new Error("Falha ao carregar planos do AlePejoServiços.");
  }

  const body = await res.json();
  return body.data;
}
