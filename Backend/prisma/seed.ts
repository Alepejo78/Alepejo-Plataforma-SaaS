import { PrismaClient, PermissionEffect, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

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
  { code: "PURCHASE", name: "Compras", route: "/erp/compras", sortOrder: 4 },
  { code: "SALES", name: "Vendas", route: "/erp/vendas", sortOrder: 5 },
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
      ["sale.view", "Consultar Vendas"],
      ["sale.create", "Criar Vendas"],
      ["sale.approve", "Aprovar Vendas"],
      ["sale.cancel", "Cancelar Vendas"],
    ],
  },
  {
    code: "PURCHASE",
    name: "Compras",
    permissions: [
      ["purchase.view", "Consultar Compras"],
      ["purchase.create", "Criar Compras"],
      ["purchase.approve", "Aprovar Compras"],
      ["purchase.receive", "Receber Compras"],
      ["purchase.cancel", "Cancelar Compras"],
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
      ["stock-movement.view", "Visualizar Movimentações"],
      ["stock-movement.create", "Registrar Movimentações"],
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