import { PrismaClient, PermissionEffect, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "alessandro.lourenco@alepejo.com.br";
const ADMIN_PASSWORD = "Lore@251378";

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
    update: {
      companyId: company.id,
      name: "Alessandro Lourenço",
      passwordHash,
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