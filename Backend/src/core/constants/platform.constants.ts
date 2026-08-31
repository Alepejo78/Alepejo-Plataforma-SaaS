/**
 * Código da empresa da própria plataforma (cadastrada uma única vez
 * por `prisma/seed.ts`) — nunca é uma empresa CLIENTE. Usada tanto pra
 * excluir a ALEPEJO da lista de empresas elegíveis a operações
 * genéricas de cliente (default-accounting, exclusão de empresa)
 * quanto pra achar a conta a pagar da própria mensalidade
 * (`BillingService`).
 */
export const PLATFORM_COMPANY_CODE = 'ALEPEJO';
