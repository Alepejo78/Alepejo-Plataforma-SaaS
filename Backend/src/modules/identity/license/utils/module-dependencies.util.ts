/**
 * Dependência entre módulos do plano customizado — marcar um dos
 * módulos abaixo tem que marcar (e cobrar) o dependido junto, porque
 * a funcionalidade não faz sentido sem ele (Compras/Vendas/Financeiro
 * e o Inventário de contagem dependem do Estoque cadastrado). Decisão
 * do usuário (10-09-2026): travar de verdade, não só avisar.
 */
export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  PURCHASE: ['INVENTORY'],
  SALES: ['INVENTORY'],
  FINANCE: ['INVENTORY'],
  INVENTORY_COUNT: ['INVENTORY'],
};

/**
 * Expande uma lista de `moduleId`s selecionados adicionando os ids
 * dos módulos exigidos por `MODULE_DEPENDENCIES` (por código), pra
 * quem chamou sem passar pelo frontend (ou driblando o disabled da
 * tela) não conseguir contratar um módulo sem a dependência dele.
 */
export function expandModuleIdsWithDependencies(
  selectedIds: string[],
  allModules: { id: string; code: string }[],
): string[] {
  const idByCode = new Map(allModules.map((m) => [m.code, m.id]));
  const codeById = new Map(allModules.map((m) => [m.id, m.code]));

  const result = new Set(selectedIds);

  for (const id of selectedIds) {
    const code = codeById.get(id);
    const deps = code ? MODULE_DEPENDENCIES[code] : undefined;

    if (!deps) continue;

    for (const depCode of deps) {
      const depId = idByCode.get(depCode);
      if (depId) result.add(depId);
    }
  }

  return Array.from(result);
}
