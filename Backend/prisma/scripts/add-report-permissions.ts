import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Insere as 6 permissões novas de "Relatório" (frente "Relatórios com
 * permissão própria") direto no banco — mais seguro que rodar o
 * `seed.ts` inteiro de novo num ambiente com dado real (o seed também
 * recria a empresa/plano/etc., tudo via upsert, mas não há motivo pra
 * arriscar isso só pra adicionar 6 linhas). Depois de inserir, concede
 * a cada permissão nova pra todo Role com `code: 'ADMIN'` — perfil
 * "Administrador" já é descrito como "acesso total ao sistema", então
 * ganhar permissão nova automaticamente é o comportamento esperado
 * (sem isso, cada empresa já existente perderia acesso aos relatórios
 * até alguém entrar na matriz e marcar manualmente).
 */

const NEW_PERMISSIONS: {
  groupCode: string;
  code: string;
  name: string;
}[] = [
  { groupCode: 'PRODUCT', code: 'product.report', name: 'Ver Relatório de Produtos' },
  { groupCode: 'PARTNER', code: 'partner.report', name: 'Ver Relatório de Parceiros' },
  { groupCode: 'PURCHASE', code: 'purchase.report', name: 'Ver Relatórios de Compras' },
  { groupCode: 'SALES', code: 'sale.report', name: 'Ver Relatórios de Vendas' },
  { groupCode: 'FINANCIAL_ENTRY', code: 'financial-entry.report', name: 'Ver Relatórios Financeiros' },
  {
    groupCode: 'HR',
    code: 'employee.report',
    name: 'Ver Relatórios de RH (Funções, Exames, Aniversariantes)',
  },
];

async function main() {
  const createdPermissionIds: string[] = [];

  for (const def of NEW_PERMISSIONS) {
    const group = await prisma.permissionGroup.findUnique({
      where: { code: def.groupCode },
    });

    if (!group) {
      console.warn(
        `Grupo de permissão "${def.groupCode}" não encontrado — pulando "${def.code}".`,
      );
      continue;
    }

    const permission = await prisma.permission.upsert({
      where: { code: def.code },
      update: { name: def.name, groupId: group.id },
      create: {
        code: def.code,
        name: def.name,
        groupId: group.id,
      },
    });

    createdPermissionIds.push(permission.id);
    console.log(`Permissão OK: ${def.code} (grupo ${def.groupCode})`);
  }

  const adminRoles = await prisma.role.findMany({
    where: { code: 'ADMIN' },
    select: { id: true, companyId: true },
  });

  console.log(`\n${adminRoles.length} perfil(is) "Administrador" encontrado(s).`);

  let grants = 0;

  for (const role of adminRoles) {
    for (const permissionId of createdPermissionIds) {
      const result = await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });

      if (result) {
        grants += 1;
      }
    }
  }

  console.log(`${grants} vínculo(s) perfil-permissão garantido(s) (já existentes ficam como estavam).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
