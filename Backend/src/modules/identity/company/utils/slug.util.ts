/** Sem acento, minusculo, so letras/numeros/hifen -- vira o pedaco amigavel da URL. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(new RegExp('[̀-ͯ]', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Gera um slug unico checando colisao no banco -- usado tanto no
 * cadastro de empresa quanto no backfill das empresas que ja existiam
 * antes desse campo. `exists` isola a consulta pra nao acoplar este
 * util ao Prisma diretamente.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'empresa';

  let candidate = root;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
