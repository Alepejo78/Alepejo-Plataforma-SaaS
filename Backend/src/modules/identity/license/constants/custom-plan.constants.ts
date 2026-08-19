/** Plan.code do plano sem planModules fixo — o acesso vem inteiro dos CompanyModule escolhidos. */
export const CUSTOM_PLAN_CODE = 'CUSTOM';

/**
 * Mínimo pro sistema funcionar, sempre garantido independente do que
 * o montador (público em `/planos` ou autenticado em Licenciamento)
 * mandar — decisão do usuário.
 */
export const MINIMUM_CUSTOM_MODULE_CODES = [
  'BPS',
  'PRODUCTS',
  'INVENTORY',
  'SALES',
  'PURCHASE',
];
