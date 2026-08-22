/**
 * Deriva a paleta de destaque a partir de UMA cor escolhida pelo
 * cliente (Personalização da marca).
 *
 * O cliente escolhe só a cor principal; hover, fundo suave, cor do
 * texto sobre ela e a versão do tema escuro saem daqui. Pedir cinco
 * cores levaria a combinações ilegíveis — e o contraste do texto sobre
 * o botão é justamente o que mais quebra quando cada uma é escolhida
 * na mão.
 */

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Aceita #RGB e #RRGGBB. Devolve null se não for hexadecimal válido. */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const limpo = hex.trim().replace(/^#/, "");

  const cheio =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;

  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) {
    return null;
  }

  return {
    r: parseInt(cheio.slice(0, 2), 16),
    g: parseInt(cheio.slice(2, 4), 16),
    b: parseInt(cheio.slice(4, 6), 16),
  };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;

  if (max === rr) {
    h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  } else if (max === gg) {
    h = ((bb - rr) / d + 2) / 6;
  } else {
    h = ((rr - gg) / d + 4) / 6;
  }

  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  function canal(p: number, q: number, t: number) {
    let tt = t;

    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;

    return p;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const componentes =
    s === 0
      ? [l, l, l]
      : [canal(p, q, h + 1 / 3), canal(p, q, h), canal(p, q, h - 1 / 3)];

  return (
    "#" +
    componentes
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

/** Luminância relativa (WCAG) — usada pra decidir a cor do texto. */
function luminancia(r: number, g: number, b: number) {
  const [rr, gg, bb] = [r, g, b].map((v) => {
    const c = v / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

export interface BrandPalette {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/**
 * Monta as variáveis `--primary*` dos dois temas. Retorna null se a cor
 * não for válida — quem chama simplesmente não aplica nada e o sistema
 * segue com o azul padrão.
 */
export function brandPalette(hex: string): BrandPalette | null {
  const rgb = parseHex(hex);

  if (!rgb) {
    return null;
  }

  const base = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Texto sobre a cor: branco ou quase-preto, o que contrastar mais.
  // Escolher pela luminância é o que garante botão legível tanto com
  // amarelo quanto com azul-marinho.
  const contraste = luminancia(rgb.r, rgb.g, rgb.b) > 0.45 ? "#0b1220" : "#ffffff";

  const claro = {
    // No tema claro a cor precisa de um piso de escuridão pra o texto
    // branco funcionar; cor clara demais vira botão ilegível.
    primary: hslToHex({ ...base, l: Math.min(base.l, 0.62) }),
    hover: hslToHex({ ...base, l: Math.max(0.24, Math.min(base.l, 0.62) - 0.08) }),
    soft: hslToHex({ h: base.h, s: Math.max(0.25, base.s * 0.6), l: 0.92 }),
    text: hslToHex({ ...base, l: Math.max(0.22, Math.min(base.l, 0.62) - 0.16) }),
  };

  const escuro = {
    // No escuro é o contrário: a cor sobe de luminosidade pra destacar
    // do fundo, e o texto sobre ela passa a ser escuro.
    primary: hslToHex({ ...base, l: Math.max(base.l, 0.68) }),
    hover: hslToHex({ ...base, l: Math.min(0.86, Math.max(base.l, 0.68) + 0.08) }),
    soft: hslToHex({ h: base.h, s: Math.max(0.2, base.s * 0.5), l: 0.16 }),
    text: hslToHex({ ...base, l: Math.max(base.l, 0.72) }),
  };

  return {
    light: {
      "--primary": claro.primary,
      "--primary-hover": claro.hover,
      "--primary-soft": claro.soft,
      "--primary-contrast": contraste,
      "--primary-text": claro.text,
    },
    dark: {
      "--primary": escuro.primary,
      "--primary-hover": escuro.hover,
      "--primary-soft": escuro.soft,
      "--primary-contrast": "#0b1220",
      "--primary-text": escuro.text,
    },
  };
}

/** Vira um bloco de CSS pronto pra injetar numa tag `<style>`. */
export function brandPaletteCss(hex: string): string | null {
  const palette = brandPalette(hex);

  if (!palette) {
    return null;
  }

  const bloco = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([nome, valor]) => `  ${nome}: ${valor};`)
      .join("\n");

  return `:root {\n${bloco(palette.light)}\n}\n:root.dark {\n${bloco(palette.dark)}\n}`;
}
