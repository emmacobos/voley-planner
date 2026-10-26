import type { DrawElement } from './types';

/** Colores del lápiz. */
export const DRAW_COLORS: { value: string; label: string }[] = [
  { value: '#E5484D', label: 'Rojo' },
  { value: '#F2CF83', label: 'Dorado' },
  { value: '#FFFFFF', label: 'Blanco' },
  { value: '#0E1A2B', label: 'Azul marino' },
];

/** Grosores del lápiz, en metros. */
export const DRAW_WIDTHS: { value: number; label: string }[] = [
  { value: 0.06, label: 'Fino' },
  { value: 0.12, label: 'Mediano' },
  { value: 0.22, label: 'Grueso' },
];

export const DEFAULT_DRAW_WIDTH = 0.12;

/** Separación mínima (m) entre puntos guardados: menos puntos, mismo dibujo. */
const MIN_STEP = 0.08;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Puntos del trazo listos para guardar: redondeados y sin los que están casi encima del anterior. */
export function simplifyStroke(points: { x: number; y: number }[]): number[] {
  const out: number[] = [];
  let last: { x: number; y: number } | null = null;
  points.forEach((p, i) => {
    const isLast = i === points.length - 1;
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP && !isLast) return;
    if (last && isLast && Math.hypot(p.x - last.x, p.y - last.y) < 0.01) return;
    out.push(round2(p.x), round2(p.y));
    last = p;
  });
  return out;
}

/** Largo total del trazo, en metros. */
export function strokeLength(points: number[]): number {
  let len = 0;
  for (let i = 2; i < points.length; i += 2) len += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  return len;
}

/**
 * Atributo `d` del trazo, suavizado: pasa por los puntos medios entre cada
 * par de puntos, usando los puntos como control (curvas cuadráticas).
 */
export function drawPath(points: number[]): string {
  const n = points.length / 2;
  if (n === 0) return '';
  const x = (i: number) => points[2 * i];
  const y = (i: number) => points[2 * i + 1];
  if (n === 1) return `M${x(0)},${y(0)} l0.001,0`;
  if (n === 2) return `M${x(0)},${y(0)} L${x(1)},${y(1)}`;
  let d = `M${x(0)},${y(0)}`;
  for (let i = 1; i < n - 1; i++) {
    const mx = round2((x(i) + x(i + 1)) / 2);
    const my = round2((y(i) + y(i + 1)) / 2);
    d += ` Q${x(i)},${y(i)} ${mx},${my}`;
  }
  return `${d} L${x(n - 1)},${y(n - 1)}`;
}

/** El trazo corrido (dx, dy) metros. */
export function moveStroke<T extends Pick<DrawElement, 'points'>>(el: T, dx: number, dy: number): T {
  return { ...el, points: el.points.map((v, i) => round2(v + (i % 2 === 0 ? dx : dy))) };
}

/** Rectángulo que ocupa el trazo. */
export function strokeBounds(points: number[]): { x1: number; y1: number; x2: number; y2: number } {
  const xs = points.filter((_, i) => i % 2 === 0);
  const ys = points.filter((_, i) => i % 2 === 1);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

/** Grosor del trazo (el mediano si no tiene). */
export function strokeWidth(el: Pick<DrawElement, 'width'>): number {
  return el.width ?? DEFAULT_DRAW_WIDTH;
}
