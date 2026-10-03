import type { BoardElement } from './types';

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Interpola la pizarra entre dos pasos. Los elementos se emparejan por id.
 * Las flechas del paso de origen se mantienen visibles durante toda la
 * transición (muestran el movimiento que está ocurriendo) y las del paso de
 * destino aparecen recién al llegar.
 */
export function interpolateFrames(
  from: BoardElement[],
  to: BoardElement[],
  t: number,
): BoardElement[] {
  if (t >= 1) return to;
  const fromById = new Map(from.map((e) => [e.id, e]));
  const toIds = new Set(to.map((e) => e.id));
  const result: BoardElement[] = [];

  for (const b of to) {
    if (b.kind === 'arrow') continue;
    const a = fromById.get(b.id);
    if (a && a.kind !== 'arrow') {
      result.push({ ...b, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
    } else if (t >= 0.5) {
      result.push(b);
    }
  }
  for (const a of from) {
    if (a.kind === 'arrow') {
      result.push(a);
    } else if (!toIds.has(a.id) && t < 0.5) {
      result.push(a);
    }
  }
  return result;
}

/**
 * Devuelve la pizarra para un progreso global p en [0, frames - 1]
 * (p = 1.5 es la mitad de la transición del paso 2 al 3).
 */
export function elementsAtProgress(
  frames: BoardElement[][],
  p: number,
): BoardElement[] {
  if (frames.length === 0) return [];
  const last = frames.length - 1;
  if (p >= last) return frames[last];
  const i = Math.max(0, Math.floor(p));
  return interpolateFrames(frames[i], frames[i + 1], easeInOut(p - i));
}
