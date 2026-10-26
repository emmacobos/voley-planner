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
    if (a && a.kind === 'shadow' && b.kind === 'shadow') {
      // La sombra del bloqueo acompaña el movimiento del bloqueo.
      result.push({
        ...b,
        x1: lerp(a.x1, b.x1, t),
        y1: lerp(a.y1, b.y1, t),
        x2: lerp(a.x2, b.x2, t),
        y2: lerp(a.y2, b.y2, t),
        startWidth: lerp(a.startWidth, b.startWidth, t),
        endWidth: lerp(a.endWidth, b.endWidth, t),
      });
    } else if (a && a.kind === 'draw' && b.kind === 'draw') {
      // Un trazo que se corrió de lugar acompaña el movimiento (si se redibujó, cambia en la mitad).
      if (a.points.length === b.points.length) result.push({ ...b, points: b.points.map((v, i) => lerp(a.points[i], v, t)) });
      else result.push(t >= 0.5 ? b : a);
    } else if (a && b.kind !== 'shadow' && b.kind !== 'draw' && a.kind !== 'arrow' && a.kind !== 'shadow' && a.kind !== 'draw') {
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

export interface PlaybackTiming {
  /** Pausa en el primer paso antes de arrancar (ms). */
  intro: number;
  /** Duración de cada transición entre pasos (ms). */
  move: number;
  /** Pausa en cada paso al llegar (ms). */
  hold: number;
  /** Pausa extra en el último paso (ms). */
  outro: number;
}

export const VIDEO_TIMING: PlaybackTiming = { intro: 1000, move: 1400, hold: 900, outro: 1200 };

/** Duración total de la reproducción de `frameCount` pasos (ms). */
export function playbackDuration(frameCount: number, timing: PlaybackTiming = VIDEO_TIMING): number {
  const transitions = Math.max(0, frameCount - 1);
  return timing.intro + transitions * (timing.move + timing.hold) + timing.outro;
}

/**
 * Progreso (0 a frameCount - 1) en el instante `ms` de una reproducción que
 * pausa en cada paso. Se usa directo con elementsAtProgress, que suaviza cada transición.
 */
export function playbackProgress(ms: number, frameCount: number, timing: PlaybackTiming = VIDEO_TIMING): number {
  const last = frameCount - 1;
  if (last <= 0) return 0;
  let t = ms - timing.intro;
  if (t <= 0) return 0;
  const step = timing.move + timing.hold;
  const seg = Math.floor(t / step);
  if (seg >= last) return last;
  t -= seg * step;
  return seg + Math.min(1, t / timing.move);
}
