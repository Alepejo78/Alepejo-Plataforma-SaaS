import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissionGroups = [
  {
    code: "SYSTEM",
    name: "Sistema",
    permissions: [
      ["system.access", "Acessar Sistema"],
      ["system.settings", "Configurações do Sistema"],
      ["system.audit", "Auditoria"],
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
      ["sales.view", "Consultar Vendas"],
      ["sales.create", "Criar Vendas"],
      ["sales.update", "Alterar Vendas"],
      ["sales.cancel", "Cancelar Vendas"],
      ["sales.invoice", "Faturar Vendas"],
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
    ],
  },
  {
    code: "INVENTORY",
    name: "Estoque",
    permissions: [
      ["inventory.view", "Consultar Estoque"],
      ["inventory.entry", "Entrada"],
      ["inventory.exit", "Saída"],
      ["inventory.adjust", "Ajuste"],
      ["inventory.transfer", "Transferência"],
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
];

async function main() {
  console.log("Iniciando Seed RBAC...");

  for (const group of permissionGroups) {
    const permissionGroup = await prisma.permissionGroup.upsert({
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

  console.log("Seed RBAC concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });