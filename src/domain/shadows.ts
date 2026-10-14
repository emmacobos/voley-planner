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
  { value: '#C0262D', label: 'Rojo' },
  { value: '#F5B82E', label: 'Amarillo' },
];

/** Líneas del texto (siempre al menos una). */
export function textLines(t: Pick<TextElement, 'text'>): string[] {
  const lines = t.text.split('\n');
  return lines.length ? lines : [''];
}

/** Medida aproximada del texto, en metros, para la selección y el tachito. */
export function textBox(t: Pick<TextElement, 'text' | 'size'>): { width: number; height: number } {
  const h = TEXT_SIZES[t.size];
  const lines = textLines(t);
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { width: longest * h * 0.55, height: lines.length * h * 1.2 };
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
