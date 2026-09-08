import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type CompanySignupPayload = {
  legalName: string;
  tradeName?: string;
  document: string;
  /** E-mail de contato da empresa — não é o de login. */
  email?: string;
  phone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  adminName: string;
  /** E-mail de login do primeiro usuário (administrador). */
  adminEmail: string;
  /** Ignorado quando `checkoutId` vem preenchido — aí o plano vem da compra. */
  planId?: string;
  /** Só pro plano Customizado (code CUSTOM) — ids dos módulos escolhidos no montador. */
  moduleIds?: string[];
  /** Compra já feita antes do cadastro (ver /checkout) — a resposta já vem com sessão ativa. */
  checkoutId?: string;
};

export interface PublicPlanModule {
  included: boolean;
  module: { id: string; code: string; name: string };
}

export interface PublicPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice?: string | number | null;
  yearlyPrice?: string | number | null;
  setupFee?: string | number | null;
  maxUsers?: number | null;
  sortOrder?: number;
  highlighted?: boolean;
  planModules?: PublicPlanModule[];
}

export type CompanyAdditionalPayload = {
  legalName: string;
  tradeName?: string;
  document: string;
  /** Obrigatório quando `document` é CPF — não tem raiz pra conferir automaticamente como o CNPJ. */
  isGroupCompany?: boolean;
  email?: string;
  phone?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
};

export interface PublicCompany {
  legalName: string;
  tradeName: string | null;
}

export interface PublicModule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice?: string | number | null;
  yearlyPrice?: string | number | null;
}

/** Compra feita em /planos que ainda não virou empresa — cliente pagou e não voltou pra terminar o cadastro. */
export interface PendingCheckout {
  id: string;
  name: string;
  email: string;
  document: string;
  phone: string | null;
  planName: string;
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  value: number;
  paid: boolean;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  resumeUrl: string;
}

export const companyOnboardingService = {
  /** Pública (sem sessão) — lista os planos comerciais pra página de preços. */
  async listPublicPlans(): Promise<PublicPlan[]> {
    const { data } = await api.get<ApiEnvelope<PublicPlan[]>>(
      "/companies/plans"
    );

    return data.data ?? [];
  },

  /** Pública (sem sessão) — módulos avulsos pro montador do plano Customizado. */
  async listPublicModules(): Promise<PublicModule[]> {
    const { data } = await api.get<ApiEnvelope<PublicModule[]>>(
      "/companies/modules"
    );

    return data.data ?? [];
  },

  /** Pública (sem sessão) — dias de teste grátis vigente, pro texto do botão em `/planos`. */
  async getPublicTrialDays(): Promise<number> {
    const { data } = await api.get<ApiEnvelope<{ trialDays: number }>>(
      "/companies/trial-days"
    );

    return data.data.trialDays;
  },

  /** Pública (sem sessão) — nome da empresa pra tela de login `/<slug>/login`. */
  async getBySlug(slug: string): Promise<PublicCompany> {
    const { data } = await api.get<ApiEnvelope<PublicCompany>>(
      `/companies/by-slug/${encodeURIComponent(slug)}`
    );

    return data.data;
  },

  async signup(
    payload: CompanySignupPayload
  ): Promise<{ companyId: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ companyId: string }>
    >("/companies/signup", payload);

    return data.data;
  },

  async createAdditional(
    payload: CompanyAdditionalPayload
  ): Promise<{ companyId: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ companyId: string }>
    >("/companies/additional", payload);

    return data.data;
  },

  /** Dono da plataforma — acha a compra pelo e-mail do cliente. */
  async findPendingCheckouts(email: string): Promise<PendingCheckout[]> {
    const { data } = await api.get<ApiEnvelope<PendingCheckout[]>>(
      "/companies/pending-checkouts",
      { params: { email } }
    );

    return data.data ?? [];
  },

  /** Dono da plataforma — reenvia o link de retomada do cadastro por e-mail/WhatsApp. */
  async resendPendingCheckout(
    id: string
  ): Promise<{ sent: boolean; channels: string[]; resumeUrl: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[]; resumeUrl: string }>
    >(`/companies/pending-checkouts/${id}/resend`);

    return data.data;
  },
};
