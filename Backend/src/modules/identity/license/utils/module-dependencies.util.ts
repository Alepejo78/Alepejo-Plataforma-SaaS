/**
 * Dependência entre módulos do plano customizado — marcar um dos
 * módulos abaixo tem que marcar (e cobrar) o dependido junto, porque
 * a funcionalidade não faz sentido sem ele (Compras/Vendas/Financeiro/
 * Produção/Inventário de contagem dependem do Estoque cadastrado; e o
 * próprio Estoque depende do cadastro de Produtos). Cadeias viram
 * transitivas em `expandModuleIdsWithDependencies` — por isso quem
 * depende só de INVENTORY já puxa PRODUCTS junto, sem precisar listar
 * os dois aqui. Decisão do usuário (10-09-2026): travar de verdade,
 * não só avisar.
 */
export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  PURCHASE: ['INVENTORY'],
  SALES: ['INVENTORY'],
  FINANCE: ['INVENTORY'],
  INVENTORY: ['PRODUCTS'],
  INVENTORY_COUNT: ['INVENTORY'],
  PRODUCTION: ['INVENTORY'],
};

/**
 * Expande uma lista de `moduleId`s selecionados adicionando os ids
 * dos módulos exigidos por `MODULE_DEPENDENCIES` (por código), de
 * forma transitiva (BFS) — se A depende de B e B depende de C,
 * selecionar A tem que puxar B e C junto. Pra quem chamou sem passar
 * pelo frontend (ou driblando o disabled da tela) não conseguir
 * contratar um módulo sem toda a cadeia de dependência dele.
 */
export function expandModuleIdsWithDependencies(
  selectedIds: string[],
  allModules: { id: string; code: string }[],
): string[] {
  const idByCode = new Map(allModules.map((m) => [m.code, m.id]));
  const codeById = new Map(allModules.map((m) => [m.id, m.code]));

  const result = new Set(selectedIds);
  const queue = [...selectedIds];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const code = codeById.get(id);
    const deps = code ? MODULE_DEPENDENCIES[code] : undefined;

    if (!deps) continue;

    for (const depCode of deps) {
      const depId = idByCode.get(depCode);
      if (depId && !result.has(depId)) {
        result.add(depId);
        queue.push(depId);
      }
    }
  }

  return Array.from(result);
}
