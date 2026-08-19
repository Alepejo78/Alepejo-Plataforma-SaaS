import { join } from 'path';

/**
 * Raiz de tudo que precisa sobreviver a um redeploy — uploads
 * (logos, fotos) e sessão do WhatsApp (Baileys, arquivo em disco).
 * Em produção (Railway ou qualquer host com disco persistente),
 * `DATA_DIR` aponta pro volume montado; sem essa variável, cai no
 * diretório do projeto — mesmo comportamento de sempre em dev local.
 */
export const DATA_DIR = process.env.DATA_DIR || process.cwd();

export function dataPath(...segments: string[]): string {
  return join(DATA_DIR, ...segments);
}
