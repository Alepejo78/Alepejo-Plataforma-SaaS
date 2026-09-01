import { PrismaClient, PermissionEffect, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "alessandro.lourenco@alepejo.com.br";
const ADMIN_PASSWORD = "Lore@251378";

/**
 * Catálogo de módulos licenciáveis.
 *
 * IMPORTANTE: o `code` precisa bater (em MAIÚSCULAS) com o valor passado
 * ao decorator @Module(...) nos controllers, porque o LicenseGuard compara
 * `module.code` com o código exigido pela rota (o decorator faz toUpperCase).
 * Ex.: products.controller usa @Module(ERP_MODULES.PRODUCTS) -> "PRODUCTS".
 */
const erpModules: {
  code: string;
  name: string;
  route: string;
  sortOrder: number;
}[] = [
  { code: "BPS", name: "Cadastros (Clientes/Fornecedores)", route: "/erp/cadastros", sortOrder: 1 },
  { code: "PRODUCTS", name: "Produtos", route: "/erp/produtos", sortOrder: 2 },
  { code: "INVENTORY", name: "Estoque", route: "/erp/estoque", sortOrder: 3 },
  { code: "INVENTORY_COUNT", name: "Inventário", route: "/erp/estoque/inventario", sortOrder: 4 },
  { code: "PURCHASE", name: "Compras", route: "/erp/compras", sortOrder: 5 },
  { code: "SALES", name: "Vendas", route: "/erp/vendas", sortOrder: 6 },
  { code: "FINANCE", name: "Financeiro", route: "/erp/financeiro", sortOrder: 7 },
  { code: "BRANDING", name: "Personalização (Marca Própria)", route: "/erp/configuracoes", sortOrder: 8 },
  { code: "HR", name: "Recursos Humanos", route: "/erp/rh", sortOrder: 9 },
  { code: "PRODUCTION", name: "Produção", route: "/erp/producao", sortOrder: 10 },
  { code: "LABOR", name: "Ponto e Folha de Pagamento", route: "/erp/rh/ponto", sortOrder: 11 },
];

/**
 * Módulos que NÃO entram automaticamente no plano padrão — são add-ons
 * vendidos à parte. Uma empresa nova só tem acesso a eles se forem
 * habilitados individualmente (ver CompanyModule mais abaixo).
 */
const ADDON_MODULE_CODES = ["INVENTORY_COUNT", "BRANDING", "HR", "PRODUCTION", "LABOR"];

/**
 * Plano de contas padrão, migrado da aba CAD_DESPESAS da planilha
 * "Controle Dedicar V1.0" (78 contas, todas de despesa). Serve só de
 * ESTRUTURA inicial para a empresa seed — nenhum valor monetário é
 * trazido da planilha, só o cadastro (código, classificação, descrição).
 */
const defaultChartOfAccounts: {
  code: string;
  classification: string;
  description: string;
}[] = [
  { code: "01.01.01", classification: "Adm - Internet", description: "Certificados" },
  { code: "01.01.02", classification: "Adm - Internet", description: "Dominio emails" },
  { code: "01.01.03", classification: "Adm - Internet", description: "Internet" },
  { code: "01.01.04", classification: "Adm - Internet", description: "Site" },
  { code: "01.02.01", classification: "ADM Escritorio", description: "Material de Escritório" },
  { code: "01.03.01", classification: "ADM Limpeza", description: "Material de Limpeza" },
  { code: "01.04.01", classification: "Adminstrativo", description: "Aluguel" },
  { code: "01.04.02", classification: "Adminstrativo", description: "Ativo Imobilizado" },
  { code: "01.04.03", classification: "Adminstrativo", description: "Comissão" },
  { code: "01.04.04", classification: "Adminstrativo", description: "Correios" },
  { code: "01.04.05", classification: "Adminstrativo", description: "DAS" },
  { code: "01.04.06", classification: "Adminstrativo", description: "Despesa Água" },
  { code: "01.04.07", classification: "Adminstrativo", description: "Despesas Telefone" },
  { code: "01.04.08", classification: "Adminstrativo", description: "Energia Elétrica" },
  { code: "01.04.09", classification: "Adminstrativo", description: "IPTU" },
  { code: "01.04.10", classification: "Adminstrativo", description: "Outras Despesas" },
  { code: "01.04.11", classification: "Adminstrativo", description: "Registro" },
  { code: "01.04.12", classification: "Adminstrativo", description: "Honorários" },
  { code: "01.04.13", classification: "Adminstrativo", description: "Reembolso/Devolução" },
  { code: "02.01.01", classification: "Bancos/Taxas", description: "Boleto" },
  { code: "02.01.02", classification: "Bancos/Taxas", description: "Cartao de Crédito" },
  { code: "02.01.03", classification: "Bancos/Taxas", description: "Cheque BB" },
  { code: "02.01.04", classification: "Bancos/Taxas", description: "Contrato" },
  { code: "02.01.05", classification: "Bancos/Taxas", description: "Empréstimo" },
  { code: "02.01.06", classification: "Bancos/Taxas", description: "GRRF" },
  { code: "02.01.07", classification: "Bancos/Taxas", description: "ISS" },
  { code: "02.01.08", classification: "Bancos/Taxas", description: "Juros" },
  { code: "02.01.09", classification: "Bancos/Taxas", description: "Renegociação" },
  { code: "02.01.10", classification: "Bancos/Taxas", description: "Tarifas/Taxas bancárias" },
  { code: "03.01.01", classification: "Fretes", description: "Despesas Transporte" },
  { code: "03.01.02", classification: "Fretes", description: "Frete" },
  { code: "04.01.01", classification: "Funcionários", description: "Exames médicos" },
  { code: "04.01.03", classification: "Funcionários", description: "Laudos" },
  { code: "04.01.04", classification: "Funcionários", description: "Pro labore" },
  { code: "04.01.05", classification: "Funcionários", description: "Reclamatória Trabalhista" },
  { code: "04.01.06", classification: "Funcionários", description: "Reembolso Despesas" },
  { code: "04.01.07", classification: "Funcionários", description: "Vale Transporte" },
  { code: "04.01.08", classification: "Funcionários", description: "13 salário" },
  { code: "04.01.09", classification: "Funcionários", description: "Adiantamento Salarial" },
  { code: "04.01.10", classification: "Funcionários", description: "Alimentação" },
  { code: "04.01.12", classification: "Funcionários", description: "Extras" },
  { code: "04.01.13", classification: "Funcionários", description: "Férias" },
  { code: "04.01.14", classification: "Funcionários", description: "FGTS" },
  { code: "04.01.15", classification: "Funcionários", description: "Horas Extras" },
  { code: "04.01.16", classification: "Funcionários", description: "INSS" },
  { code: "04.01.17", classification: "Funcionários", description: "Rescisão" },
  { code: "04.01.18", classification: "Funcionários", description: "Salários" },
  { code: "05.01.01", classification: "Manutenção", description: "Manutenção de Computadores" },
  { code: "05.01.02", classification: "Manutenção", description: "Manutenção Maquinas/Equipamentos" },
  { code: "05.01.03", classification: "Manutenção", description: "Manutenção Predial" },
  { code: "05.01.04", classification: "Manutenção", description: "Ferramentas" },
  { code: "06.01.01", classification: "Fabrica", description: "Aluguel de equipamentos" },
  { code: "06.01.02", classification: "Fabrica", description: "Avaria Equipamentos" },
  { code: "06.01.03", classification: "Fabrica", description: "Locação de Maquinas/Equipamentos" },
  { code: "06.01.04", classification: "Fabrica", description: "Maquinas e Equipamentos" },
  { code: "06.01.05", classification: "Fabrica", description: "Maquinas/Equipamento" },
  { code: "06.01.06", classification: "Fabrica", description: "Matéria-prima" },
  { code: "07.01.01", classification: "MKT", description: "ART" },
  { code: "07.01.02", classification: "MKT", description: "Gráfica" },
  { code: "07.01.03", classification: "MKT", description: "Plotagem" },
  { code: "07.01.04", classification: "MKT", description: "Projetista" },
  { code: "07.01.05", classification: "MKT", description: "Propaganda" },
  { code: "08.01.01", classification: "Particular", description: "Despesas Diversas" },
  { code: "08.01.02", classification: "Particular", description: "Particular" },
  { code: "09.01.01", classification: "Segurança", description: "EPIs" },
  { code: "10.01.01", classification: "Terceiros", description: "Despesas com terceiros" },
  { code: "11.01.01", classification: "Veiculo", description: "Aluguel de Veículo" },
  { code: "11.01.02", classification: "Veiculo", description: "Combustível" },
  { code: "11.01.03", classification: "Veiculo", description: "Despesas Carro" },
  { code: "11.01.04", classification: "Veiculo", description: "Documento veículo" },
  { code: "11.01.05", classification: "Veiculo", description: "Financiamento veículos" },
  { code: "11.01.06", classification: "Veiculo", description: "IPVA" },
  { code: "11.01.07", classification: "Veiculo", description: "Manutenção de veículo" },
  { code: "11.01.08", classification: "Veiculo", description: "Multas" },
  { code: "11.01.09", classification: "Veiculo", description: "Veículos" },
  { code: "11.01.10", classification: "Viagens", description: "Despesas com viagens" },
  { code: "12.01.01", classification: "Viagens", description: "Hospedagem" },
  { code: "12.01.02", classification: "Viagens", description: "Despesas com refeição" },
];

/**
 * RH — dados reais migrados da aba CAD_FUNCAO da planilha "Controle
 * Dedicar V1.0" (11 funções de uma confecção). Serve de ponto de partida
 * pra empresa seed testar o módulo; numa empresa nova isso não existe.
 */
const defaultSectors = [
  "Administrativo",
  "Corte",
  "Acabamento",
  "Costura",
  "Pilotagem/Desenvolvimento",
];

const defaultWorkSchedules: { name: string; description: string }[] = [
  {
    name: "Comercial (Seg a Sex)",
    description: "SEG A SEX: 07:30 - 12:00 | 13:12 - 17:30",
  },
];

const defaultPpeTypes = [
  "Luva Multitato",
  "Uniforme (Calça/Camisa)",
  "Luva Látex",
  "Protetor Auditivo Plug",
  "Avental PVC",
];

const defaultBenefits: {
  name: string;
  calculationType: "FIXED" | "PERCENTAGE";
}[] = [
  { name: "Vale Transporte", calculationType: "PERCENTAGE" },
  { name: "Vale Refeição", calculationType: "FIXED" },
  { name: "Vale Alimentação", calculationType: "FIXED" },
];

const defaultJobFunctions: {
  cboCode: string;
  name: string;
  description?: string;
  sector: string;
  baseSalary: number;
  workSchedule: string;
  requiresPpe: boolean;
  ppeTypes: string[];
}[] = [
  { cboCode: "2524-05", name: "Analista de RH", sector: "Administrativo", baseSalary: 1500, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7631-05", name: "Auxiliar de Corte", description: "Auxilia no enfesto e etiquetagem das peças, e no acabamento das peças, quando necessário.", sector: "Corte", baseSalary: 1200, workSchedule: "Comercial (Seg a Sex)", requiresPpe: true, ppeTypes: ["Luva Multitato"] },
  { cboCode: "7632-10", name: "Auxiliar de Costura", description: "Auxilia no acabamento final das peças, tira linha, abotoa, dobra e embala as peças.", sector: "Acabamento", baseSalary: 1350, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7631-05", name: "Cortador", description: "Operar máquinas de corte manual, acompanhando e dando manutenção na máquina, se necessário.", sector: "Corte", baseSalary: 1350, workSchedule: "Comercial (Seg a Sex)", requiresPpe: true, ppeTypes: ["Luva Multitato"] },
  { cboCode: "7632-10", name: "Costureira", description: "Costurar em todas as máquinas da empresa e realizar consertos nas peças, quando necessário.", sector: "Costura", baseSalary: 1500, workSchedule: "Comercial (Seg a Sex)", requiresPpe: true, ppeTypes: ["Uniforme (Calça/Camisa)", "Luva Látex", "Protetor Auditivo Plug", "Avental PVC"] },
  { cboCode: "7632-10", name: "Distribuidor (a)", description: "Distribui o serviço entre todas as costureiras.", sector: "Costura", baseSalary: 1300, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7603-10", name: "Encarregada de Costura", description: "Responsável pelo setor de produção. Auxilia nas dúvidas do processo produtivo.", sector: "Costura", baseSalary: 1800, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7613-45", name: "Passadeira", description: "Organiza as peças e passa cada uma delas. Auxilia nas outras atividades do setor.", sector: "Costura", baseSalary: 1300, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7632-10", name: "Pilotista", description: "Realizar costuras completas das peças pilotos desenvolvidas, utilizando de diversas máquinas de costura. Organizar a equipe e peças pilotos a serem costuradas.", sector: "Pilotagem/Desenvolvimento", baseSalary: 1300, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7632-10", name: "Revisora", description: "Revisar as peças prontas, verificar se há defeitos nas peças, separar e arrumar.", sector: "Acabamento", baseSalary: 1300, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
  { cboCode: "7632-10", name: "Operador de Prensa", sector: "Acabamento", baseSalary: 1300, workSchedule: "Comercial (Seg a Sex)", requiresPpe: false, ppeTypes: [] },
];

/**
 * Plano padrão. Inclui todos os módulos acima para que a empresa seed
 * (ALEPEJO) tenha acesso total assim que o sistema sobe. Sem isso, o
 * LicenseGuard bloquearia (403) todos os módulos não-básicos.
 */
const DEFAULT_PLAN = {
  code: "ENTERPRISE",
  name: "Enterprise",
  description: "Plano completo com todos os módulos.",
};

const permissionGroups = [
  {
    code: "SYSTEM",
    name: "Sistema",
    permissions: [
      ["system.access", "Acessar Sistema"],
      ["system.settings", "Configurações do Sistema"],
      ["system.audit", "Auditoria"],
      ["system.admin", "Administração Geral"],
    ],
  },
  {
    code: "COMPANY",
    name: "Empresa",
    permissions: [
      ["company.view", "Visualizar Empresa"],
      ["company.create", "Cadastrar Empresa"],
      ["company.update", "Alterar Empresa"],
      ["company.delete", "Excluir Empresa"],
    ],
  },
  {
    code: "USER",
    name: "Usuários",
    permissions: [
      ["user.view", "Visualizar Usuários"],
      ["user.create", "Cadastrar Usuários"],
      ["user.update", "Alterar Usuários"],
      ["user.delete", "Excluir Usuários"],
      ["user.activate", "Ativar Usuários"],
      ["user.deactivate", "Desativar Usuários"],
      ["user.block", "Bloquear Conta de Usuários"],
      ["user.unblock", "Desbloquear Conta de Usuários"],
      ["user.reset-password", "Redefinir Senha de Usuários"],
    ],
  },
  {
    code: "ROLE",
    name: "Perfis",
    permissions: [
      ["role.view", "Visualizar Perfis"],
      ["role.create", "Cadastrar Perfis"],
      ["role.update", "Alterar Perfis"],
      ["role.delete", "Excluir Perfis"],
    ],
  },
  {
    code: "FINANCIAL",
    name: "Financeiro",
    permissions: [
      ["financial.view", "Consultar Financeiro"],
      ["financial.create", "Lançar Financeiro"],
      ["financial.update", "Alterar Financeiro"],
      ["financial.delete", "Excluir Financeiro"],
      ["financial.approve", "Aprovar Financeiro"],
    ],
  },
  {
    code: "SALES",
    name: "Vendas",
    permissions: [
      ["sale.view", "Consultar Vendas"],
      ["sale.create", "Criar Vendas"],
      ["sale.update", "Alterar Vendas"],
      ["sale.approve", "Aprovar Vendas"],
      ["sale.cancel", "Cancelar Vendas"],
      ["sale.reverse", "Estornar Vendas"],
      ["sale.report", "Ver Relatórios de Vendas"],
      ["sale.delete", "Excluir Vendas"],
    ],
  },
  {
    code: "QUOTE",
    name: "Orçamentos",
    permissions: [
      ["quote.view", "Consultar Orçamentos"],
      ["quote.create", "Criar Orçamentos"],
      ["quote.update", "Alterar Orçamentos"],
      ["quote.approve", "Aprovar Orçamentos"],
      ["quote.cancel", "Cancelar Orçamentos"],
    ],
  },
  {
    code: "SALES_ORDER",
    name: "Pedidos de Venda",
    permissions: [
      ["sales-order.view", "Consultar Pedidos de Venda"],
      ["sales-order.create", "Criar Pedidos de Venda"],
      ["sales-order.update", "Alterar Pedidos de Venda"],
      ["sales-order.approve", "Aprovar Pedidos de Venda"],
      ["sales-order.cancel", "Cancelar Pedidos de Venda"],
      ["sales-order.delete", "Excluir Pedidos de Venda"],
    ],
  },
  {
    code: "CHART_OF_ACCOUNT",
    name: "Plano de Contas",
    permissions: [
      ["chart-of-account.view", "Consultar Plano de Contas"],
      ["chart-of-account.create", "Cadastrar Contas"],
      ["chart-of-account.update", "Alterar Contas"],
      ["chart-of-account.delete", "Excluir Contas"],
    ],
  },
  {
    code: "CHART_OF_ACCOUNT_CLASSIFICATION",
    name: "Classificações do Plano de Contas",
    permissions: [
      ["chart-of-account-classification.view", "Consultar Classificações"],
      ["chart-of-account-classification.create", "Cadastrar Classificações"],
      ["chart-of-account-classification.update", "Alterar Classificações"],
      ["chart-of-account-classification.delete", "Excluir Classificações"],
    ],
  },
  {
    code: "FINANCIAL_ENTRY",
    name: "Contas a Pagar/Receber",
    permissions: [
      ["financial-entry.view", "Consultar Contas a Pagar/Receber"],
      ["financial-entry.create", "Lançar Títulos"],
      ["financial-entry.update", "Alterar Títulos"],
      ["financial-entry.settle", "Baixar Títulos"],
      ["financial-entry.cancel", "Cancelar Títulos"],
      ["financial-entry.delete", "Excluir Títulos"],
      ["financial-entry.report", "Ver Relatórios Financeiros"],
    ],
  },
  {
    code: "BUDGET",
    name: "Orçamento",
    permissions: [
      ["budget.view", "Consultar Orçamento"],
      ["budget.manage", "Lançar Valores Orçados"],
    ],
  },
  {
    code: "PURCHASE",
    name: "Compras",
    permissions: [
      ["purchase.view", "Consultar Compras"],
      ["purchase.create", "Criar Compras"],
      ["purchase.update", "Alterar Compras"],
      ["purchase.approve", "Aprovar Compras"],
      ["purchase.receive", "Receber Compras"],
      ["purchase.cancel", "Cancelar Compras"],
      ["purchase.reverse", "Estornar Compras"],
      ["purchase.report", "Ver Relatórios de Compras"],
      ["purchase.delete", "Excluir Compras"],
    ],
  },
  {
    code: "QUOTATION",
    name: "Cotações",
    permissions: [
      ["quotation.view", "Consultar Cotações"],
      ["quotation.create", "Criar Cotações"],
      ["quotation.update", "Alterar Cotações"],
      ["quotation.decide", "Escolher Fornecedor Vencedor da Cotação"],
      ["quotation.cancel", "Cancelar Cotações"],
    ],
  },
  {
    code: "PURCHASE_ORDER",
    name: "Pedidos de Compra",
    permissions: [
      ["purchase-order.view", "Consultar Pedidos de Compra"],
      ["purchase-order.create", "Criar Pedidos de Compra"],
      ["purchase-order.update", "Alterar Pedidos de Compra"],
      ["purchase-order.cancel", "Cancelar Pedidos de Compra"],
    ],
  },
  {
    code: "INVENTORY",
    name: "Estoque",
    permissions: [
      ["inventory.view", "Consultar Estoque"],
      ["inventory.create", "Cadastrar Registro de Estoque"],
      ["inventory.update", "Alterar Registro de Estoque"],
      ["inventory.delete", "Excluir Registro de Estoque"],
      ["inventory.entry", "Entrada"],
      ["inventory.exit", "Saída"],
      ["inventory.adjust", "Ajuste"],
      ["inventory.transfer", "Transferência"],
      ["inventory.hold", "Bloquear/Reservar/Quarentena/Avaria"],
      ["inventory.release-hold", "Liberar Bloqueio/Reserva/Quarentena/Avaria"],
    ],
  },
  {
    code: "PARTNER",
    name: "Parceiros (Clientes/Fornecedores)",
    permissions: [
      ["partner.view", "Visualizar Parceiros"],
      ["partner.create", "Cadastrar Parceiros"],
      ["partner.update", "Alterar Parceiros"],
      ["partner.delete", "Excluir Parceiros"],
      ["partner.report", "Ver Relatório de Parceiros"],
    ],
  },
  {
    code: "PRODUCT",
    name: "Produtos",
    permissions: [
      ["product.view", "Visualizar Produtos"],
      ["product.create", "Cadastrar Produtos"],
      ["product.update", "Alterar Produtos"],
      ["product.delete", "Excluir Produtos"],
      ["product.report", "Ver Relatório de Produtos"],
    ],
  },
  {
    code: "PRODUCT_CATEGORY",
    name: "Categorias de Produto",
    permissions: [
      ["product-category.view", "Visualizar Categorias"],
      ["product-category.create", "Cadastrar Categorias"],
      ["product-category.update", "Alterar Categorias"],
      ["product-category.delete", "Excluir Categorias"],
    ],
  },
  {
    code: "BRAND",
    name: "Marcas",
    permissions: [
      ["brand.view", "Visualizar Marcas"],
      ["brand.create", "Cadastrar Marcas"],
      ["brand.update", "Alterar Marcas"],
      ["brand.delete", "Excluir Marcas"],
    ],
  },
  {
    code: "UNIT_OF_MEASURE",
    name: "Unidades de Medida",
    permissions: [
      ["unit-of-measure.view", "Visualizar Unidades de Medida"],
      ["unit-of-measure.create", "Cadastrar Unidades de Medida"],
      ["unit-of-measure.update", "Alterar Unidades de Medida"],
      ["unit-of-measure.delete", "Excluir Unidades de Medida"],
    ],
  },
  {
    code: "WAREHOUSE",
    name: "Depósitos",
    permissions: [
      ["warehouse.view", "Visualizar Depósitos"],
      ["warehouse.create", "Cadastrar Depósitos"],
      ["warehouse.update", "Alterar Depósitos"],
      ["warehouse.delete", "Excluir Depósitos"],
    ],
  },
  {
    code: "STOCK_MOVEMENT",
    name: "Movimentação de Estoque",
    permissions: [
      // Não confundir com o acesso normal de Compras/Vendas — receber
      // uma compra ou aprovar uma venda já movimenta estoque sozinho,
      // sem precisar de permissão nenhuma daqui (aquilo usa
      // purchase.receive/sale.approve). O ajuste manual de estoque
      // (antigo "Ajuste de entrada/saída") saiu daqui — agora só
      // acontece via Contagem de Inventário (ver grupo
      // INVENTORY_COUNT).
      ["stock-movement.view", "Visualizar Movimentações"],
    ],
  },
  {
    code: "INVENTORY_COUNT",
    name: "Contagem de Inventário",
    permissions: [
      ["inventory-count.view", "Consultar Contagens de Inventário"],
      ["inventory-count.create", "Cadastrar Contagens de Inventário"],
      ["inventory-count.update", "Alterar Contagens de Inventário"],
      ["inventory-count.cancel", "Cancelar Contagens de Inventário"],
      ["inventory-count.delete", "Excluir Contagens de Inventário"],
      // Cobre as duas etapas: finalizar (trava a contagem) e ajustar
      // o estoque (gera as entradas/saídas necessárias).
      ["inventory-count.approve", "Aprovar Contagens de Inventário (finaliza e ajusta o estoque)"],
    ],
  },
  {
    // Grupo separado (linha própria na matriz de Perfis de acesso) —
    // fora do grupo INVENTORY_COUNT pra não virar coluna solta ali,
    // e sim ganhar as colunas padrão Consultar/Editar.
    code: "INVENTORY_COUNT_TRACKING",
    name: "Acompanhamento de Inventário",
    permissions: [
      // Dá acesso à tela de Acompanhamento de inventário (gestão das
      // contagens em andamento) — as ações lá dentro continuam
      // valendo suas próprias permissões.
      ["inventory-count-tracking.view", "Acessar Acompanhamento de Inventário (tela)"],
      // Libera, no painel de acompanhamento, editar direto as
      // colunas de Contagem 1/2/3 — corrigir uma leitura já feita ou
      // digitar a quantidade sem passar pela tela de leitura.
      ["inventory-count-tracking.update", "Editar Leituras de Contagem (corrigir ou digitar direto)"],
    ],
  },
  {
    code: "PERMISSION",
    name: "Permissões (Plataforma)",
    permissions: [
      ["permission.view", "Visualizar Permissões"],
      ["platform.permission.manage", "Gerenciar Catálogo de Permissões"],
    ],
  },
  {
    code: "ROLE_PERMISSION",
    name: "Vínculo Perfil x Permissão",
    permissions: [
      ["role-permission.view", "Visualizar Vínculos"],
      ["role-permission.manage", "Gerenciar Vínculos"],
    ],
  },
  {
    code: "USER_ROLE",
    name: "Vínculo Usuário x Perfil",
    permissions: [
      ["user-role.view", "Visualizar Vínculos"],
      ["user-role.manage", "Gerenciar Vínculos"],
    ],
  },
  {
    code: "LICENSE",
    name: "Licenciamento",
    permissions: [
      ["license.view", "Ver Minha Licença"],
      ["license.trial", "Iniciar Trial de Módulo"],
      ["license.catalog.view", "Ver Catálogo de Planos/Módulos"],
      ["platform.license.manage", "Gerenciar Licenciamento (Plataforma)"],
      // Exclusão FÍSICA de empresa (irreversível) — restrita ao dono da
      // plataforma, mesma trava de e-mail de platform.license.manage
      // (ver PLATFORM_OWNER_ONLY_PERMISSIONS em permissions.guard.ts).
      // Não confundir com "company.delete" (grupo COMPANY): aquela é
      // uma permissão de tenant que hoje não tem nenhuma rota que a
      // use (código morto) — esta aqui é a de verdade.
      ["platform.company.delete", "Excluir Empresa Permanentemente (Plataforma)"],
    ],
  },
  {
    code: "CRM",
    name: "CRM",
    permissions: [
      ["crm.view", "Consultar CRM"],
      ["crm.create", "Cadastrar CRM"],
      ["crm.update", "Alterar CRM"],
      ["crm.delete", "Excluir CRM"],
    ],
  },
  {
    code: "COMPANY_BRANDING",
    name: "Personalização de Marca",
    permissions: [
      ["company-branding.view", "Consultar Personalização de Marca"],
      ["company-branding.update", "Alterar Personalização de Marca"],
    ],
  },
  {
    code: "WHATSAPP",
    name: "WhatsApp",
    permissions: [
      ["whatsapp.view", "Ver Status do WhatsApp"],
      ["whatsapp.manage", "Gerenciar Pareamento do WhatsApp"],
    ],
  },
  {
    code: "EMAIL",
    name: "E-mail",
    permissions: [
      ["email.view", "Ver Configuração de E-mail"],
      ["email.manage", "Gerenciar Configuração de E-mail"],
    ],
  },
  {
    code: "SCHEDULED_NOTIFICATIONS",
    name: "Avisos Automáticos",
    permissions: [
      [
        "scheduled-notifications.manage",
        "Disparar Avisos Automáticos Manualmente",
      ],
    ],
  },
  {
    code: "PRODUCTION",
    name: "Produção",
    permissions: [
      ["production-order.view", "Consultar Ordens de Produção"],
      ["production-order.create", "Cadastrar Ordem de Produção"],
      ["production-order.update", "Alterar Ordem de Produção"],
      ["production-order.cancel", "Cancelar Ordem de Produção"],
      [
        "production-order.complete",
        "Concluir/Estornar Ordem de Produção",
      ],
    ],
  },
  {
    code: "PRODUCTION_SETTINGS",
    name: "Configurações de Produção",
    permissions: [
      ["production-settings.view", "Consultar Configurações de Produção"],
      ["production-settings.manage", "Alterar Configurações de Produção"],
    ],
  },
  {
    code: "TIME_ENTRY",
    name: "Ponto",
    permissions: [
      ["time-entry.view", "Consultar Ponto"],
      ["time-entry.create", "Registrar Ponto"],
      ["time-entry.update", "Alterar/Excluir Batida de Ponto"],
      ["time-entry.approve", "Aprovar/Reabrir Dia de Ponto"],
      [
        "time-clock.manage-api-key",
        "Gerenciar Chave de API do Relógio de Ponto",
      ],
    ],
  },
  {
    code: "ABSENCE_RECORD",
    name: "Faltas e Abonos",
    permissions: [
      ["absence-record.view", "Consultar Faltas e Abonos"],
      ["absence-record.create", "Registrar Falta/Abono"],
      ["absence-record.update", "Alterar/Excluir Falta/Abono"],
      ["absence-record.approve", "Aprovar/Rejeitar Falta/Abono"],
    ],
  },
  {
    code: "SECTOR",
    name: "Setores",
    permissions: [
      ["sector.view", "Visualizar Setores"],
      ["sector.create", "Cadastrar Setores"],
      ["sector.update", "Alterar Setores"],
      ["sector.delete", "Excluir Setores"],
    ],
  },
  {
    code: "WORK_SCHEDULE",
    name: "Horários",
    permissions: [
      ["work-schedule.view", "Visualizar Horários"],
      ["work-schedule.create", "Cadastrar Horários"],
      ["work-schedule.update", "Alterar Horários"],
      ["work-schedule.delete", "Excluir Horários"],
    ],
  },
  {
    code: "PPE_TYPE",
    name: "Tipos de EPI",
    permissions: [
      ["ppe-type.view", "Visualizar Tipos de EPI"],
      ["ppe-type.create", "Cadastrar Tipos de EPI"],
      ["ppe-type.update", "Alterar Tipos de EPI"],
      ["ppe-type.delete", "Excluir Tipos de EPI"],
    ],
  },
  {
    code: "JOB_FUNCTION",
    name: "Funções",
    permissions: [
      ["job-function.view", "Visualizar Funções"],
      ["job-function.create", "Cadastrar Funções"],
      ["job-function.update", "Alterar Funções"],
      ["job-function.delete", "Excluir Funções"],
      // Tabela CBO é catálogo global (todas as empresas), não por
      // empresa — restrita ao dono da plataforma, mesma trava de
      // e-mail de platform.company.delete (ver
      // PLATFORM_OWNER_ONLY_PERMISSIONS em permissions.guard.ts).
      ["platform.cbo.manage", "Gerenciar Tabela CBO (Plataforma)"],
    ],
  },
  {
    code: "EMPLOYEE",
    name: "Colaboradores",
    permissions: [
      ["employee.view", "Visualizar Colaboradores"],
      ["employee.create", "Cadastrar Colaboradores"],
      ["employee.update", "Alterar Colaboradores"],
      ["employee.delete", "Excluir Colaboradores"],
      [
        "employee.report",
        "Ver Relatórios de RH (Funções, Exames, Aniversariantes)",
      ],
    ],
  },
  {
    code: "PPE_DELIVERY",
    name: "Entregas de EPI",
    permissions: [
      ["ppe-delivery.view", "Visualizar Entregas de EPI"],
      ["ppe-delivery.create", "Registrar Entregas de EPI"],
      ["ppe-delivery.delete", "Excluir Entregas de EPI"],
      ["ppe-delivery.approve", "Confirmar Recebimento de EPI (manual ou enviar link)"],
    ],
  },
  {
    code: "BENEFIT",
    name: "Benefícios",
    permissions: [
      ["benefit.view", "Visualizar Benefícios"],
      ["benefit.create", "Cadastrar Benefícios"],
      ["benefit.update", "Alterar Benefícios"],
      ["benefit.delete", "Excluir Benefícios"],
    ],
  },
  {
    code: "PAYROLL_TAX_TABLE",
    name: "Parâmetros Fiscais da Folha",
    permissions: [
      [
        "payroll-tax-table.view",
        "Consultar Parâmetros Fiscais (INSS/IRRF/FGTS)",
      ],
      [
        "payroll-tax-table.manage",
        "Alterar Parâmetros Fiscais (INSS/IRRF/FGTS)",
      ],
    ],
  },
  {
    code: "PAYROLL_SETTINGS",
    name: "Configurações da Folha",
    permissions: [
      ["payroll-settings.view", "Consultar Configurações da Folha"],
      ["payroll-settings.manage", "Alterar Configurações da Folha"],
    ],
  },
  {
    code: "PAYROLL",
    name: "Folha de Pagamento",
    permissions: [
      ["payroll.view", "Consultar Folha de Pagamento"],
      ["payroll.generate", "Gerar Folha de Pagamento"],
      ["payroll.update", "Alterar Itens da Folha (recalcular/ajustar/excluir)"],
      ["payroll.approve", "Aprovar Folha de Pagamento"],
      ["payroll.cancel", "Cancelar Folha de Pagamento"],
      ["payroll.delete", "Excluir Folha de Pagamento Cancelada"],
      ["payroll.report", "Ver Relatórios/Holerites da Folha"],
      ["payroll.confirm-item", "Confirmar Recebimento de Holerite (manual ou enviar link)"],
    ],
  },
  {
    code: "THIRTEENTH_SALARY",
    name: "13º Salário",
    permissions: [
      ["thirteenth-salary.view", "Consultar 13º Salário"],
      ["thirteenth-salary.generate", "Gerar Parcela de 13º Salário"],
      ["thirteenth-salary.update", "Alterar Itens do 13º (ajustar/excluir)"],
      ["thirteenth-salary.approve", "Aprovar 13º Salário"],
      ["thirteenth-salary.cancel", "Cancelar 13º Salário"],
      ["thirteenth-salary.report", "Ver Recibos do 13º Salário"],
    ],
  },
  {
    code: "VACATION",
    name: "Férias",
    permissions: [
      ["vacation.view", "Consultar Férias"],
      ["vacation.create", "Conceder Férias"],
      ["vacation.update", "Ajustar Gozo de Férias"],
      ["vacation.approve", "Aprovar Gozo de Férias"],
      ["vacation.cancel", "Cancelar Gozo de Férias"],
      ["vacation.report", "Ver Recibos de Férias"],
    ],
  },
];

async function main() {
  console.log("Iniciando Seed...");

  const passwordHash = await bcrypt.hash(
    ADMIN_PASSWORD,
    12,
  );

  const company = await prisma.company.upsert({
    where: {
      code: "ALEPEJO",
    },
    update: {},
    create: {
      code: "ALEPEJO",
      slug: "alepejo",
      legalName: "AlePejo Tecnologia Ltda",
      tradeName: "AlePejo",
      document: "00000000000191",
      email: ADMIN_EMAIL,
      phone: "(11)0000-0000",
      mobile: "(11)99999-9999",
      website: "https://alepejo.com.br",
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
      active: true,
    },
  });

  for (const group of permissionGroups) {
    const permissionGroup =
      await prisma.permissionGroup.upsert({
        where: {
          code: group.code,
        },
        update: {
          name: group.name,
        },
        create: {
          code: group.code,
          name: group.name,
        },
      });

    for (const permission of group.permissions) {
      await prisma.permission.upsert({
        where: {
          code: permission[0],
        },
        update: {
          name: permission[1],
          groupId: permissionGroup.id,
          active: true,
        },
        create: {
          code: permission[0],
          name: permission[1],
          groupId: permissionGroup.id,
          active: true,
        },
      });
    }
  }
  // ==========================
  // Licenciamento: módulos + plano padrão + vínculo com a empresa
  // ==========================

  for (const mod of erpModules) {
    await prisma.module.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        route: mod.route,
        sortOrder: mod.sortOrder,
        active: true,
      },
      create: {
        code: mod.code,
        name: mod.name,
        route: mod.route,
        sortOrder: mod.sortOrder,
        active: true,
      },
    });
  }

  const defaultPlan = await prisma.plan.upsert({
    where: { code: DEFAULT_PLAN.code },
    update: {
      name: DEFAULT_PLAN.name,
      description: DEFAULT_PLAN.description,
      active: true,
    },
    create: {
      code: DEFAULT_PLAN.code,
      name: DEFAULT_PLAN.name,
      description: DEFAULT_PLAN.description,
      active: true,
    },
  });

  const allModules = await prisma.module.findMany();

  for (const mod of allModules) {
    // Add-ons (ex.: BRANDING) ficam fora do plano padrão — são
    // vendidos/habilitados à parte, nunca vêm "de brinde".
    if (ADDON_MODULE_CODES.includes(mod.code)) {
      continue;
    }

    await prisma.planModule.upsert({
      where: {
        planId_moduleId: {
          planId: defaultPlan.id,
          moduleId: mod.id,
        },
      },
      update: { included: true },
      create: {
        planId: defaultPlan.id,
        moduleId: mod.id,
        included: true,
      },
    });
  }

  // Planos comerciais (venda de verdade — ENTERPRISE acima é só pra
  // uso interno/demo). Sem preço aqui: valor é preenchido depois na
  // tela de administração, pra não chumbar preço errado no código.
  // Mesma composição de módulos de add-billing-catalog.ts — se mudar
  // aqui, mudar lá também (ou o próximo `db seed` diverge do backfill
  // já rodado num banco existente).
  const COMMERCIAL_PLANS: {
    code: string;
    name: string;
    description: string;
    sortOrder: number;
    highlighted: boolean;
    moduleCodes: string[];
  }[] = [
    {
      code: "ESSENCIAL",
      name: "Essencial",
      description:
        "Cadastros, produtos, estoque, vendas e financeiro — o básico pra rodar um comércio.",
      sortOrder: 1,
      highlighted: false,
      moduleCodes: ["BPS", "PRODUCTS", "INVENTORY", "SALES", "FINANCE"],
    },
    {
      code: "PROFISSIONAL",
      name: "Profissional",
      description: "Essencial + Compras e Recursos Humanos.",
      sortOrder: 2,
      highlighted: true,
      moduleCodes: [
        "BPS",
        "PRODUCTS",
        "INVENTORY",
        "SALES",
        "FINANCE",
        "PURCHASE",
        "HR",
      ],
    },
    {
      code: "COMPLETO",
      name: "Completo",
      description: "Profissional + Produção e Ponto/Folha de Pagamento.",
      sortOrder: 3,
      highlighted: false,
      moduleCodes: [
        "BPS",
        "PRODUCTS",
        "INVENTORY",
        "SALES",
        "FINANCE",
        "PURCHASE",
        "HR",
        "PRODUCTION",
        "LABOR",
      ],
    },
    {
      // Mesma composição de add-billing-catalog.ts — se mudar aqui, mudar lá também.
      code: "CUSTOM",
      name: "Plano Customizado",
      description: "Monte o plano escolhendo só os módulos que sua empresa precisa.",
      sortOrder: 99,
      highlighted: false,
      moduleCodes: [] as string[],
    },
  ];

  for (const def of COMMERCIAL_PLANS) {
    const commercialPlan = await prisma.plan.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        description: def.description,
        sortOrder: def.sortOrder,
        highlighted: def.highlighted,
        active: true,
      },
      create: {
        code: def.code,
        name: def.name,
        description: def.description,
        sortOrder: def.sortOrder,
        highlighted: def.highlighted,
        active: true,
      },
    });

    for (const moduleCode of def.moduleCodes) {
      const mod = allModules.find((m) => m.code === moduleCode);

      if (!mod) {
        continue;
      }

      await prisma.planModule.upsert({
        where: {
          planId_moduleId: { planId: commercialPlan.id, moduleId: mod.id },
        },
        update: { included: true },
        create: {
          planId: commercialPlan.id,
          moduleId: mod.id,
          included: true,
        },
      });
    }
  }

  // A empresa seed (ALEPEJO) ganha o add-on BRANDING habilitado
  // individualmente, para poder testar o módulo de personalização.
  // Uma empresa nova, sem essa concessão, fica no padrão (tema claro
  // fixo, sem upload de logo) até o módulo ser vendido/habilitado.
  const brandingModule = allModules.find(
    (mod) => mod.code === "BRANDING",
  );

  if (brandingModule) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId: brandingModule.id,
        },
      },
      update: { enabled: true, licensed: true },
      create: {
        companyId: company.id,
        moduleId: brandingModule.id,
        enabled: true,
        licensed: true,
      },
    });
  }

  // Mesma lógica para o add-on HR, também habilitado na empresa seed
  // para poder testar o módulo de RH.
  const hrModule = allModules.find((mod) => mod.code === "HR");

  if (hrModule) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId: hrModule.id,
        },
      },
      update: { enabled: true, licensed: true },
      create: {
        companyId: company.id,
        moduleId: hrModule.id,
        enabled: true,
        licensed: true,
      },
    });
  }

  // Mesma lógica para o add-on PRODUCTION, também habilitado na
  // empresa seed para poder testar o módulo de Produção.
  const productionModule = allModules.find(
    (mod) => mod.code === "PRODUCTION",
  );

  if (productionModule) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId: productionModule.id,
        },
      },
      update: { enabled: true, licensed: true },
      create: {
        companyId: company.id,
        moduleId: productionModule.id,
        enabled: true,
        licensed: true,
      },
    });
  }

  // Mesma lógica para o add-on LABOR (Ponto e Folha de Pagamento),
  // também habilitado na empresa seed para poder testar.
  const laborModule = allModules.find(
    (mod) => mod.code === "LABOR",
  );

  if (laborModule) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId: laborModule.id,
        },
      },
      update: { enabled: true, licensed: true },
      create: {
        companyId: company.id,
        moduleId: laborModule.id,
        enabled: true,
        licensed: true,
      },
    });
  }

  // Mesma lógica para o add-on INVENTORY_COUNT (Inventário: contagem,
  // acompanhamento e dashboard), também habilitado na empresa seed
  // para poder testar.
  const inventoryCountModule = allModules.find(
    (mod) => mod.code === "INVENTORY_COUNT",
  );

  if (inventoryCountModule) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId: company.id,
          moduleId: inventoryCountModule.id,
        },
      },
      update: { enabled: true, licensed: true },
      create: {
        companyId: company.id,
        moduleId: inventoryCountModule.id,
        enabled: true,
        licensed: true,
      },
    });
  }

  await prisma.companyPlan.upsert({
    where: { companyId: company.id },
    update: {
      planId: defaultPlan.id,
      active: true,
    },
    create: {
      companyId: company.id,
      planId: defaultPlan.id,
      active: true,
    },
  });

  const administratorRole =
  await prisma.role.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: "ADMIN",
      },
    },
    update: {
      name: "Administrador",
    },
    create: {
      companyId: company.id,
      code: "ADMIN",
      name: "Administrador",
      description:
        "Perfil com acesso total ao sistema.",
      active: true,
    },
  });

const permissions =
  await prisma.permission.findMany();

for (const permission of permissions) {
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: administratorRole.id,
        permissionId: permission.id,
      },
    },
    update: {
      effect: PermissionEffect.ALLOW,
    },
    create: {
      roleId: administratorRole.id,
      permissionId: permission.id,
      effect: PermissionEffect.ALLOW,
    },
  });
}

const administrator =
  await prisma.user.upsert({
    where: {
      email: ADMIN_EMAIL,
    },
    // Não mexe na senha de quem já existe — só na criação inicial.
    // Rodar o seed de novo (ex.: pra aplicar permissões novas) não
    // pode resetar a senha que o usuário já trocou.
    update: {
      companyId: company.id,
      name: "Alessandro Lourenço",
      status: UserStatus.ACTIVE,
      active: true,
    },
    create: {
      companyId: company.id,
      name: "Alessandro Lourenço",
      email: ADMIN_EMAIL,
      passwordHash,
      status: UserStatus.ACTIVE,
      active: true,
    },
  });

await prisma.userRole.upsert({
  where: {
    userId_roleId: {
      userId: administrator.id,
      roleId: administratorRole.id,
    },
  },
  update: {},
  create: {
    userId: administrator.id,
    roleId: administratorRole.id,
  },
});

const classificationIds = new Map<string, string>();

for (const name of new Set(
  defaultChartOfAccounts.map((a) => a.classification),
)) {
  const classification =
    await prisma.chartOfAccountClassification.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name,
        },
      },
      update: {
        active: true,
      },
      create: {
        companyId: company.id,
        name,
        active: true,
      },
    });

  classificationIds.set(name, classification.id);
}

for (const account of defaultChartOfAccounts) {
  await prisma.chartOfAccount.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: account.code,
      },
    },
    update: {
      classificationId: classificationIds.get(
        account.classification,
      )!,
      description: account.description,
      active: true,
    },
    create: {
      companyId: company.id,
      code: account.code,
      classificationId: classificationIds.get(
        account.classification,
      )!,
      description: account.description,
      type: "DESPESA",
      active: true,
    },
  });
}

// ============================================================
// RH — CBO (catálogo global) + Setores/Horários/EPIs/Funções da
// empresa seed (dados reais migrados da planilha CAD_FUNCAO).
// ============================================================

const cboCsvPath = path.join(__dirname, "data", "cbo.csv");
const cboCsv = fs.readFileSync(cboCsvPath, "utf-8");
const cboLines = cboCsv.split(/\r?\n/).slice(1).filter(Boolean);

const cboRows = cboLines.map((line) => {
  const idx = line.indexOf(",");
  return {
    code: line.slice(0, idx),
    title: line.slice(idx + 1),
  };
});

await prisma.cboOccupation.createMany({
  data: cboRows,
  skipDuplicates: true,
});

const cboTitleByCode = new Map(
  cboRows.map((row) => [row.code, row.title]),
);

const sectorIds = new Map<string, string>();

for (const name of defaultSectors) {
  const sector = await prisma.sector.upsert({
    where: { companyId_name: { companyId: company.id, name } },
    update: {},
    create: { companyId: company.id, name },
  });

  sectorIds.set(name, sector.id);
}

const workScheduleIds = new Map<string, string>();

for (const ws of defaultWorkSchedules) {
  const schedule = await prisma.workSchedule.upsert({
    where: {
      companyId_name: { companyId: company.id, name: ws.name },
    },
    update: { description: ws.description },
    create: {
      companyId: company.id,
      name: ws.name,
      description: ws.description,
    },
  });

  workScheduleIds.set(ws.name, schedule.id);
}

const ppeTypeIds = new Map<string, string>();

for (const name of defaultPpeTypes) {
  const ppe = await prisma.ppeType.upsert({
    where: { companyId_name: { companyId: company.id, name } },
    update: {},
    create: { companyId: company.id, name },
  });

  ppeTypeIds.set(name, ppe.id);
}

for (const b of defaultBenefits) {
  await prisma.benefit.upsert({
    where: {
      companyId_name: { companyId: company.id, name: b.name },
    },
    update: { calculationType: b.calculationType },
    create: {
      companyId: company.id,
      name: b.name,
      calculationType: b.calculationType,
    },
  });
}

for (const jf of defaultJobFunctions) {
  await prisma.jobFunction.upsert({
    where: {
      companyId_name: { companyId: company.id, name: jf.name },
    },
    update: {
      cboCode: jf.cboCode,
      cboTitle: cboTitleByCode.get(jf.cboCode),
      description: jf.description,
      sectorId: sectorIds.get(jf.sector),
      baseSalary: jf.baseSalary,
      salaryType: "MENSALISTA",
      workScheduleId: workScheduleIds.get(jf.workSchedule),
      requiresPpe: jf.requiresPpe,
      ppeTypes: {
        set: jf.ppeTypes.map((name) => ({
          id: ppeTypeIds.get(name)!,
        })),
      },
    },
    create: {
      companyId: company.id,
      name: jf.name,
      cboCode: jf.cboCode,
      cboTitle: cboTitleByCode.get(jf.cboCode),
      description: jf.description,
      sectorId: sectorIds.get(jf.sector),
      baseSalary: jf.baseSalary,
      salaryType: "MENSALISTA",
      workScheduleId: workScheduleIds.get(jf.workSchedule),
      requiresPpe: jf.requiresPpe,
      ppeTypes: {
        connect: jf.ppeTypes.map((name) => ({
          id: ppeTypeIds.get(name)!,
        })),
      },
    },
  });
}

console.log("");
console.log(
  "========================================",
);
console.log(
  "Seed executado com sucesso.",
);
console.log(
  `Empresa: ${company.tradeName}`,
);
console.log(
  `Usuário: ${ADMIN_EMAIL}`,
);
console.log(
  `Senha: ${ADMIN_PASSWORD}`,
);
console.log(
  "========================================",
);
}
main()
  .catch((error) => {
    console.error("");
    console.error("Erro durante Seed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });