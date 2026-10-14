import type { BlockShadowElement, TextElement, TextSize } from './types';

type Pt = { x: number; y: number };

export const DEFAULT_SHADOW = { startWidth: 1.4, endWidth: 3.4 };

/**
 * Esquinas de la sombra del bloqueo: un trapecio que nace en el bloqueo con
 * el ancho `startWidth` y se abre hasta `endWidth` en el otro extremo.
 */
export function shadowCorners(s: Pick<BlockShadowElement, 'x1' | 'y1' | 'x2' | 'y2' | 'startWidth' | 'endWidth'>): Pt[] {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len };
  const a = s.startWidth / 2;
  const b = s.endWidth / 2;
  return [
    { x: s.x1 + n.x * a, y: s.y1 + n.y * a },
    { x: s.x2 + n.x * b, y: s.y2 + n.y * b },
    { x: s.x2 - n.x * b, y: s.y2 - n.y * b },
    { x: s.x1 - n.x * a, y: s.y1 - n.y * a },
  ];
}

export function shadowPoints(s: Parameters<typeof shadowCorners>[0]): string {
  return shadowCorners(s)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
}

/** Alto de letra en metros para cada tamaño de texto. */
export const TEXT_SIZES: Record<TextSize, number> = { S: 0.42, M: 0.6, L: 0.85 };

export const TEXT_COLORS: { value: string; label: string }[] = [
  { value: '#0E1A2B', label: 'Azul marino' },
  { value: '#FFFFFF', label: 'Blanco' },
  { value: '#7A1424', label: 'Vino' },
  { value: '#DFB97D', label: 'Dorado' },
];

/** Rango del alto de letra (en metros) que se puede elegir. */
export const TEXT_FONT_RANGE = { min: 0.25, max: 2.5 };
/** Ancho mínimo del cuadro de texto, en metros. */
export const TEXT_MIN_WIDTH = 0.8;
/** Lo que se muestra en la pizarra mientras el texto está vacío. */
export const TEXT_PLACEHOLDER = 'Texto';

/**
 * Ancho de un texto en metros para una letra de `size` metros de alto. Por
 * defecto es una estimación; el navegador la reemplaza por la medida real de
 * la tipografía (ver `setTextMeasurer`).
 */
type Measurer = (text: string, size: number) => number;
let measure: Measurer = (text, size) => text.length * size * 0.6;

export function setTextMeasurer(fn: Measurer) {
  measure = fn;
}

type TextShape = Pick<TextElement, 'text' | 'size'> & Partial<Pick<TextElement, 'fontSize' | 'width'>>;

/** Alto de letra en metros: el elegido a mano o el del tamaño de base. */
export function textFontSize(t: Pick<TextElement, 'size'> & Partial<Pick<TextElement, 'fontSize'>>): number {
  return t.fontSize ?? TEXT_SIZES[t.size];
}

/** Ancho de una línea, incluido el contorno blanco que la rodea. */
function lineWidth(line: string, size: number): number {
  return measure(line, size) + size * 0.16;
}

/**
 * Líneas del texto (siempre al menos una). Si el cuadro tiene ancho, corta las
 * líneas para que entren; una palabra sola más larga que el cuadro se corta
 * por letras, así nunca se sale.
 */
export function textLines(t: Pick<TextElement, 'text'> & Partial<TextShape>): string[] {
  const text = t.text || TEXT_PLACEHOLDER;
  if (!t.width || !t.size) return text.split('\n');
  const size = textFontSize(t as TextShape);
  const max = t.width;
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (lineWidth(candidate, size) <= max) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      line = '';
      // La palabra sola no entra: se parte en pedazos que entren.
      let rest = word;
      while (lineWidth(rest, size) > max && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && lineWidth(rest.slice(0, n), size) > max) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    out.push(line);
  }
  return out.length ? out : [''];
}

/** Ancho mínimo del cuadro: el de la palabra más larga (así ninguna se corta). */
export function textMinWidth(t: TextShape): number {
  const size = textFontSize(t);
  const words = (t.text || TEXT_PLACEHOLDER).split(/\s+/).filter(Boolean);
  return Math.max(TEXT_MIN_WIDTH, ...words.map((w) => lineWidth(w, size)));
}

/** Medida del texto en metros (el cuadro de selección siempre lo envuelve). */
export function textBox(t: TextShape): { width: number; height: number } {
  const h = textFontSize(t);
  const lines = textLines(t);
  const longest = Math.max(h * 0.6, ...lines.map((l) => lineWidth(l, h)));
  return { width: t.width ? Math.max(t.width, longest) : longest, height: lines.length * h * 1.2 };
}

/** Parte un texto en líneas de hasta `maxChars` caracteres, respetando los saltos de línea. */
export function wrapText(text: string, maxChars = 26): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && (line + ' ' + word).length > maxChars) {
        out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    out.push(line);
  }
  return out.filter((l, i, all) => l || (i > 0 && i < all.length - 1));
}
