import type { ArrowElement } from './types';

type Pt = { x: number; y: number };
type ArrowGeom = Pick<ArrowElement, 'x1' | 'y1' | 'x2' | 'y2' | 'curve'>;

/** Normal unitaria a la recta del inicio al fin de la flecha (o null si es un punto). */
function normal(a: ArrowGeom): Pt | null {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy);
  return len === 0 ? null : { x: -dy / len, y: dx / len };
}

/**
 * Punto de control de la curva (Bézier cuadrática). `curve` es cuánto se
 * separa del centro de la recta el punto medio de la flecha, en metros.
 */
export function controlPoint(a: ArrowGeom): Pt {
  const mx = (a.x1 + a.x2) / 2;
  const my = (a.y1 + a.y2) / 2;
  const n = normal(a);
  const c = a.curve ?? 0;
  if (!n || c === 0) return { x: mx, y: my };
  return { x: mx + n.x * c * 2, y: my + n.y * c * 2 };
}

/** Punto medio de la flecha, donde se dibuja el control para curvarla. */
export function midPoint(a: ArrowGeom): Pt {
  const c = controlPoint(a);
  return { x: 0.25 * a.x1 + 0.5 * c.x + 0.25 * a.x2, y: 0.25 * a.y1 + 0.5 * c.y + 0.25 * a.y2 };
}

/** Curvatura que deja el punto medio de la flecha en `p`. */
export function curveThrough(a: ArrowGeom, p: Pt): number {
  const n = normal(a);
  if (!n) return 0;
  const mx = (a.x1 + a.x2) / 2;
  const my = (a.y1 + a.y2) / 2;
  const c = (p.x - mx) * n.x + (p.y - my) * n.y;
  // Muy cerca de la recta: queda recta.
  return Math.abs(c) < 0.1 ? 0 : Math.round(c * 100) / 100;
}

/** Atributo `d` del trazo SVG de la flecha. */
export function arrowPath(a: ArrowGeom): string {
  if (!a.curve) return `M${a.x1},${a.y1} L${a.x2},${a.y2}`;
  const c = controlPoint(a);
  return `M${a.x1},${a.y1} Q${c.x},${c.y} ${a.x2},${a.y2}`;
}

export type ArrowKind = 'desplazamiento' | 'pelota' | 'curva' | 'curva-punteada';

/**
 * Tipos de flecha, cada uno con su color. El tipo sale de cómo es la flecha:
 * punteada (desplazamiento) o continua (pelota), recta o curva.
 */
export const ARROW_KINDS: { value: ArrowKind; label: string; color: string; style: ArrowElement['style']; curved: boolean }[] = [
  { value: 'desplazamiento', label: 'Desplazamiento', color: '#2F3A4A', style: 'move', curved: false },
  { value: 'pelota', label: 'Pelota', color: '#1C1915', style: 'ball', curved: false },
  { value: 'curva', label: 'Curva', color: '#7A1424', style: 'ball', curved: true },
  { value: 'curva-punteada', label: 'Curva punteada', color: '#5F6B3F', style: 'move', curved: true },
];

export function arrowKind(a: Pick<ArrowElement, 'style' | 'curve'>): ArrowKind {
  const curved = !!a.curve;
  if (a.style === 'move') return curved ? 'curva-punteada' : 'desplazamiento';
  return curved ? 'curva' : 'pelota';
}

/** Color de una flecha según su tipo. */
export function arrowColor(a: Pick<ArrowElement, 'style' | 'curve'>): string {
  const kind = arrowKind(a);
  return ARROW_KINDS.find((k) => k.value === kind)!.color;
}

/** Las de desplazamiento (rectas o curvas) son punteadas. */
export function arrowDashed(a: Pick<ArrowElement, 'style'>): boolean {
  return a.style === 'move';
}

/** Id del marcador SVG de la punta para un color. */
export function headMarkerId(color: string): string {
  return `head-${color.replace('#', '').toLowerCase()}`;
}
