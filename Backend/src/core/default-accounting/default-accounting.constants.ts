/**
 * Plano de contas padrão de toda empresa nova (cliente do AlePejo ERP
 * Cloud) — desde 01-09-2026 é também o plano de contas da própria
 * ALEPEJO (`prisma/seed.ts` importa esta mesma lista, ver comentário
 * lá).
 *
 * 6 classificações / 42 contas, todas tipo DESPESA (decisão do
 * usuário, 31-08-2026). Ortografia corrigida em relação à lista
 * original ("Adminstrativo" → "Administrativo", "Cartao de Crédito" →
 * "Cartão de Crédito", "13 salário" → "13º Salário", "Cheque BB" →
 * "Cheque", por não fazer sentido amarrar o plano de contas padrão a
 * um banco específico).
 */
export interface DefaultChartOfAccountEntry {
  code: string;
  classification: string;
  description: string;
}

/** Conta usada pela mensalidade do próprio ERP (billing.service.ts) — única referenciada fora deste módulo. */
export const SYSTEM_EXPENSE_ACCOUNT_CODE = '01.01.01';
export const SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION = 'Sistemas';
export const SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION = 'Despesas com sistema ERP';

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultChartOfAccountEntry[] = [
  { code: '01.01.01', classification: 'Sistemas', description: 'Despesas com sistema ERP' },
  { code: '01.02.01', classification: 'ADM Escritorio', description: 'Material de Escritório' },
  { code: '01.03.01', classification: 'ADM Limpeza', description: 'Material de Limpeza' },
  { code: '01.04.01', classification: 'Administrativo', description: 'Aluguel' },
  { code: '01.04.02', classification: 'Administrativo', description: 'Ativo Imobilizado' },
  { code: '01.04.03', classification: 'Administrativo', description: 'Comissão' },
  { code: '01.04.04', classification: 'Administrativo', description: 'Correios' },
  { code: '01.04.05', classification: 'Administrativo', description: 'DAS' },
  { code: '01.04.06', classification: 'Administrativo', description: 'Despesa Água' },
  { code: '01.04.07', classification: 'Administrativo', description: 'Despesas Telefone' },
  { code: '01.04.08', classification: 'Administrativo', description: 'Energia Elétrica' },
  { code: '01.04.09', classification: 'Administrativo', description: 'IPTU' },
  { code: '01.04.10', classification: 'Administrativo', description: 'Outras Despesas' },
  { code: '01.04.11', classification: 'Administrativo', description: 'Registro' },
  { code: '01.04.12', classification: 'Administrativo', description: 'Honorários' },
  { code: '01.04.13', classification: 'Administrativo', description: 'Reembolso/Devolução' },
  { code: '02.01.01', classification: 'Funcionários', description: 'Exames médicos' },
  { code: '02.01.02', classification: 'Funcionários', description: 'Laudos' },
  { code: '02.01.03', classification: 'Funcionários', description: 'Pró-labore' },
  { code: '02.01.04', classification: 'Funcionários', description: 'Reclamatória Trabalhista' },
  { code: '02.01.05', classification: 'Funcionários', description: 'Reembolso Despesas' },
  { code: '02.01.06', classification: 'Funcionários', description: 'Vale Transporte' },
  { code: '02.01.07', classification: 'Funcionários', description: '13º Salário' },
  { code: '02.01.08', classification: 'Funcionários', description: 'Adiantamento Salarial' },
  { code: '02.01.09', classification: 'Funcionários', description: 'Alimentação' },
  { code: '02.01.10', classification: 'Funcionários', description: 'Extras' },
  { code: '02.01.11', classification: 'Funcionários', description: 'Férias' },
  { code: '02.01.12', classification: 'Funcionários', description: 'FGTS' },
  { code: '02.01.13', classification: 'Funcionários', description: 'Horas Extras' },
  { code: '02.01.14', classification: 'Funcionários', description: 'INSS' },
  { code: '02.01.15', classification: 'Funcionários', description: 'Rescisão' },
  { code: '02.01.16', classification: 'Funcionários', description: 'Salários' },
  { code: '03.01.01', classification: 'Bancos/Taxas', description: 'Boleto' },
  { code: '03.01.02', classification: 'Bancos/Taxas', description: 'Cartão de Crédito' },
  { code: '03.01.03', classification: 'Bancos/Taxas', description: 'Cheque' },
  { code: '03.01.04', classification: 'Bancos/Taxas', description: 'Contrato' },
  { code: '03.01.05', classification: 'Bancos/Taxas', description: 'Empréstimo' },
  { code: '03.01.06', classification: 'Bancos/Taxas', description: 'GRRF' },
  { code: '03.01.07', classification: 'Bancos/Taxas', description: 'ISS' },
  { code: '03.01.08', classification: 'Bancos/Taxas', description: 'Juros' },
  { code: '03.01.09', classification: 'Bancos/Taxas', description: 'Renegociação' },
  { code: '03.01.10', classification: 'Bancos/Taxas', description: 'Tarifas/Taxas bancárias' },
];

/** Unidade de medida padrão de toda empresa nova. */
export const DEFAULT_UNIT_CODE = 'UN';
export const DEFAULT_UNIT_DESCRIPTION = 'Unidade';

/**
 * Produto/serviço padrão usado como item do título de mensalidade do
 * próprio ERP (ver `syncFinancialEntry` em billing.service.ts) — só
 * para o título já nascer com produto preenchido, sem virar Venda de
 * verdade (decisão do usuário, 31-08-2026: leitura "a", não "b").
 */
export const SYSTEM_EXPENSE_PRODUCT_CODE = '0001';
export const SYSTEM_EXPENSE_PRODUCT_DESCRIPTION = 'Compra sistema ERP';
