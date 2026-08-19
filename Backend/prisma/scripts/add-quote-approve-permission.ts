import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Insere a permissão nova "quote.approve" direto no banco (mesmo
 * padrão de add-report-permissions.ts) e concede pra todo Role com
 * `code: 'ADMIN'` — sem isso, empresas já existentes perderiam acesso
 * até alguém entrar na matriz e marcar manualmente.
 */
async function main() {
  const group = await prisma.permissionGroup.findUnique({
    where: { code: 'SALES' },
  });

  if (!group) {
    console.error('Grupo de permissão "SALES" não encontrado.');
    process.exitCode = 1;
    return;
  }

  const permission = await prisma.permission.upsert({
    where: { code: 'quote.approve' },
    update: { name: 'Aprovar Orçamentos', groupId: group.id },
    create: {
      code: 'quote.approve',
      name: 'Aprovar Orçamentos',
      groupId: group.id,
    },
  });

  console.log(`Permissão OK: ${permission.code}`);

  const adminRoles = await prisma.role.findMany({
    where: { code: 'ADMIN' },
    select: { id: true },
  });

  console.log(`${adminRoles.length} perfil(is) "Administrador" encontrado(s).`);

  let grants = 0;

  for (const role of adminRoles) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });

    grants += 1;
  }

  console.log(`${grants} vínculo(s) perfil-permissão garantido(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
