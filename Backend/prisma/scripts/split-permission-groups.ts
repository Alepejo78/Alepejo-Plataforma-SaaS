import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Alguns grupos de permissão juntavam várias telas diferentes num só
 * grupo (ex.: "PURCHASE" tinha Compra + Cotação + Pedido de Compra
 * juntos). A matriz de Perfis de acesso só mostra UMA caixa por
 * coluna por grupo (`Array.find` pega só a primeira permissão que
 * bate o sufixo ".view"/".create"/etc.) — então quando duas telas do
 * mesmo grupo tinham a mesma ação, uma ficava escondida atrás da
 * outra, impossível de marcar/desmarcar. Este script separa cada tela
 * pro seu próprio grupo (== sua própria linha na matriz), espelhando
 * exatamente a divisão feita em `prisma/seed.ts`.
 *
 * Só mexe no catálogo global de PermissionGroup/Permission (nenhum
 * dos dois tem companyId — são compartilhados entre todas as
 * empresas). Os vínculos RolePermission (por empresa) apontam pro
 * `permissionId`, que não muda — ninguém perde nem ganha acesso, só
 * a categorização visual na matriz é corrigida.
 */
const NEW_GROUPS: {
  code: string;
  name: string;
  permissions: [string, string][];
}[] = [
  {
    code: 'QUOTE',
    name: 'Orçamentos',
    permissions: [
      ['quote.view', 'Consultar Orçamentos'],
      ['quote.create', 'Criar Orçamentos'],
      ['quote.update', 'Alterar Orçamentos'],
      ['quote.approve', 'Aprovar Orçamentos'],
      ['quote.cancel', 'Cancelar Orçamentos'],
    ],
  },
  {
    code: 'SALES_ORDER',
    name: 'Pedidos de Venda',
    permissions: [
      ['sales-order.view', 'Consultar Pedidos de Venda'],
      ['sales-order.create', 'Criar Pedidos de Venda'],
      ['sales-order.update', 'Alterar Pedidos de Venda'],
      ['sales-order.cancel', 'Cancelar Pedidos de Venda'],
    ],
  },
  {
    code: 'QUOTATION',
    name: 'Cotações',
    permissions: [
      ['quotation.view', 'Consultar Cotações'],
      ['quotation.create', 'Criar Cotações'],
      ['quotation.update', 'Alterar Cotações'],
      [
        'quotation.decide',
        'Escolher Fornecedor Vencedor da Cotação',
      ],
      ['quotation.cancel', 'Cancelar Cotações'],
    ],
  },
  {
    code: 'PURCHASE_ORDER',
    name: 'Pedidos de Compra',
    permissions: [
      ['purchase-order.view', 'Consultar Pedidos de Compra'],
      ['purchase-order.create', 'Criar Pedidos de Compra'],
      ['purchase-order.update', 'Alterar Pedidos de Compra'],
      ['purchase-order.cancel', 'Cancelar Pedidos de Compra'],
    ],
  },
  {
    code: 'PRODUCTION_SETTINGS',
    name: 'Configurações de Produção',
    permissions: [
      [
        'production-settings.view',
        'Consultar Configurações de Produção',
      ],
      [
        'production-settings.manage',
        'Alterar Configurações de Produção',
      ],
    ],
  },
  {
    code: 'TIME_ENTRY',
    name: 'Ponto',
    permissions: [
      ['time-entry.view', 'Consultar Ponto'],
      ['time-entry.create', 'Registrar Ponto'],
      ['time-entry.update', 'Alterar/Excluir Batida de Ponto'],
      ['time-entry.approve', 'Aprovar/Reabrir Dia de Ponto'],
      [
        'time-clock.manage-api-key',
        'Gerenciar Chave de API do Relógio de Ponto',
      ],
    ],
  },
  {
    code: 'ABSENCE_RECORD',
    name: 'Faltas e Abonos',
    permissions: [
      ['absence-record.view', 'Consultar Faltas e Abonos'],
      ['absence-record.create', 'Registrar Falta/Abono'],
      ['absence-record.update', 'Alterar/Excluir Falta/Abono'],
      ['absence-record.approve', 'Aprovar/Rejeitar Falta/Abono'],
    ],
  },
  {
    code: 'SECTOR',
    name: 'Setores',
    permissions: [
      ['sector.view', 'Visualizar Setores'],
      ['sector.create', 'Cadastrar Setores'],
      ['sector.update', 'Alterar Setores'],
      ['sector.delete', 'Excluir Setores'],
    ],
  },
  {
    code: 'WORK_SCHEDULE',
    name: 'Horários',
    permissions: [
      ['work-schedule.view', 'Visualizar Horários'],
      ['work-schedule.create', 'Cadastrar Horários'],
      ['work-schedule.update', 'Alterar Horários'],
      ['work-schedule.delete', 'Excluir Horários'],
    ],
  },
  {
    code: 'PPE_TYPE',
    name: 'Tipos de EPI',
    permissions: [
      ['ppe-type.view', 'Visualizar Tipos de EPI'],
      ['ppe-type.create', 'Cadastrar Tipos de EPI'],
      ['ppe-type.update', 'Alterar Tipos de EPI'],
      ['ppe-type.delete', 'Excluir Tipos de EPI'],
    ],
  },
  {
    code: 'JOB_FUNCTION',
    name: 'Funções',
    permissions: [
      ['job-function.view', 'Visualizar Funções'],
      ['job-function.create', 'Cadastrar Funções'],
      ['job-function.update', 'Alterar Funções'],
      ['job-function.delete', 'Excluir Funções'],
    ],
  },
  {
    code: 'EMPLOYEE',
    name: 'Colaboradores',
    permissions: [
      ['employee.view', 'Visualizar Colaboradores'],
      ['employee.create', 'Cadastrar Colaboradores'],
      ['employee.update', 'Alterar Colaboradores'],
      ['employee.delete', 'Excluir Colaboradores'],
      [
        'employee.report',
        'Ver Relatórios de RH (Funções, Exames, Aniversariantes)',
      ],
    ],
  },
  {
    code: 'PPE_DELIVERY',
    name: 'Entregas de EPI',
    permissions: [
      ['ppe-delivery.view', 'Visualizar Entregas de EPI'],
      ['ppe-delivery.create', 'Registrar Entregas de EPI'],
      ['ppe-delivery.delete', 'Excluir Entregas de EPI'],
    ],
  },
  {
    code: 'BENEFIT',
    name: 'Benefícios',
    permissions: [
      ['benefit.view', 'Visualizar Benefícios'],
      ['benefit.create', 'Cadastrar Benefícios'],
      ['benefit.update', 'Alterar Benefícios'],
      ['benefit.delete', 'Excluir Benefícios'],
    ],
  },
  {
    code: 'PAYROLL_TAX_TABLE',
    name: 'Parâmetros Fiscais da Folha',
    permissions: [
      [
        'payroll-tax-table.view',
        'Consultar Parâmetros Fiscais (INSS/IRRF/FGTS)',
      ],
      [
        'payroll-tax-table.manage',
        'Alterar Parâmetros Fiscais (INSS/IRRF/FGTS)',
      ],
    ],
  },
  {
    code: 'PAYROLL_SETTINGS',
    name: 'Configurações da Folha',
    permissions: [
      ['payroll-settings.view', 'Consultar Configurações da Folha'],
      ['payroll-settings.manage', 'Alterar Configurações da Folha'],
    ],
  },
  {
    code: 'THIRTEENTH_SALARY',
    name: '13º Salário',
    permissions: [
      ['thirteenth-salary.view', 'Consultar 13º Salário'],
      ['thirteenth-salary.generate', 'Gerar Parcela de 13º Salário'],
      [
        'thirteenth-salary.update',
        'Alterar Itens do 13º (ajustar/excluir)',
      ],
      ['thirteenth-salary.approve', 'Aprovar 13º Salário'],
      ['thirteenth-salary.cancel', 'Cancelar 13º Salário'],
      ['thirteenth-salary.report', 'Ver Recibos do 13º Salário'],
    ],
  },
  {
    code: 'VACATION',
    name: 'Férias',
    permissions: [
      ['vacation.view', 'Consultar Férias'],
      ['vacation.create', 'Conceder Férias'],
      ['vacation.update', 'Ajustar Gozo de Férias'],
      ['vacation.approve', 'Aprovar Gozo de Férias'],
      ['vacation.cancel', 'Cancelar Gozo de Férias'],
      ['vacation.report', 'Ver Recibos de Férias'],
    ],
  },
];

async function main() {
  let groupsCreated = 0;
  let permissionsMoved = 0;

  for (const group of NEW_GROUPS) {
    const permissionGroup = await prisma.permissionGroup.upsert({
      where: { code: group.code },
      update: { name: group.name },
      create: { code: group.code, name: group.name },
    });

    groupsCreated += 1;

    for (const [code, name] of group.permissions) {
      await prisma.permission.upsert({
        where: { code },
        update: { name, groupId: permissionGroup.id, active: true },
        create: {
          code,
          name,
          groupId: permissionGroup.id,
          active: true,
        },
      });

      permissionsMoved += 1;
    }

    console.log(
      `Grupo OK: ${group.code} (${group.permissions.length} permissão(ões))`,
    );
  }

  console.log(
    `\n${groupsCreated} grupo(s) garantido(s), ${permissionsMoved} permissão(ões) recategorizada(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
