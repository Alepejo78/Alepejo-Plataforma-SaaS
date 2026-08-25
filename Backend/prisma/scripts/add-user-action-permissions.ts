import { PrismaClient, Permission } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Separa as ações de usuário (ativar/desativar/bloquear/desbloquear/
 * redefinir senha) de "user.update" em permissões próprias — antes
 * todas caíam em "user.update", sem controle fino. Concede as novas
 * pra todo Role que já tinha "user.update", pra não tirar acesso de
 * ninguém que já usava essas ações.
 */
const NEW_PERMISSIONS: [string, string][] = [
  ['user.activate', 'Ativar Usuários'],
  ['user.deactivate', 'Desativar Usuários'],
  ['user.block', 'Bloquear Conta de Usuários'],
  ['user.unblock', 'Desbloquear Conta de Usuários'],
  ['user.reset-password', 'Redefinir Senha de Usuários'],
];

async function main() {
  const group = await prisma.permissionGroup.findUnique({
    where: { code: 'USER' },
  });

  if (!group) {
    console.error('Grupo de permissão "USER" não encontrado.');
    process.exitCode = 1;
    return;
  }

  const permissions: Permission[] = [];

  for (const [code, name] of NEW_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { name, groupId: group.id },
      create: { code, name, groupId: group.id },
    });

    permissions.push(permission);
    console.log(`Permissão OK: ${permission.code}`);
  }

  const updatePermission = await prisma.permission.findUnique({
    where: { code: 'user.update' },
  });

  if (!updatePermission) {
    console.error('Permissão "user.update" não encontrada.');
    process.exitCode = 1;
    return;
  }

  const rolesWithUpdate = await prisma.rolePermission.findMany({
    where: { permissionId: updatePermission.id },
    select: { roleId: true },
  });

  console.log(
    `${rolesWithUpdate.length} perfil(is) com "user.update" encontrado(s).`,
  );

  let grants = 0;

  for (const { roleId } of rolesWithUpdate) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId: permission.id },
        },
        update: {},
        create: { roleId, permissionId: permission.id },
      });

      grants += 1;
    }
  }

  console.log(`${grants} vínculo(s) perfil-permissão garantido(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
