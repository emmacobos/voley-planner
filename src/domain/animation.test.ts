import { describe, expect, it } from 'vitest';
import { elementsAtProgress, interpolateFrames, playbackDuration, playbackProgress } from './animation';
import type { BoardElement } from './types';

const ball = (x: number, y: number): BoardElement => ({ id: 'b', kind: 'ball', x, y });
const arrow: BoardElement = {
  id: 'f',
  kind: 'arrow',
  style: 'move',
  x1: 0,
  y1: 0,
  x2: 1,
  y2: 1,
};
const cone: BoardElement = { id: 'c', kind: 'cone', x: 5, y: 5 };

describe('interpolateFrames', () => {
  it('interpola posiciones de elementos con el mismo id', () => {
    const [b] = interpolateFrames([ball(0, 0)], [ball(10, 4)], 0.5);
    expect(b).toMatchObject({ x: 5, y: 2 });
  });

  it('mantiene las flechas del paso de origen durante la transición', () => {
    const mid = interpolateFrames([ball(0, 0), arrow], [ball(1, 1)], 0.9);
    expect(mid.some((e) => e.kind === 'arrow')).toBe(true);
    const end = interpolateFrames([ball(0, 0), arrow], [ball(1, 1)], 1);
    expect(end.some((e) => e.kind === 'arrow')).toBe(false);
  });

  it('hace aparecer y desaparecer elementos a mitad de camino', () => {
    expect(interpolateFrames([cone], [], 0.4)).toHaveLength(1);
    expect(interpolateFrames([cone], [], 0.6)).toHaveLength(0);
    expect(interpolateFrames([], [cone], 0.4)).toHaveLength(0);
    expect(interpolateFrames([], [cone], 0.6)).toHaveLength(1);
  });
});

describe('elementsAtProgress', () => {
  it('devuelve el último paso al terminar', () => {
    const frames = [[ball(0, 0)], [ball(2, 0)], [ball(4, 0)]];
    expect(elementsAtProgress(frames, 2)).toEqual([ball(4, 0)]);
    expect(elementsAtProgress(frames, 1)[0]).toMatchObject({ x: 2 });
  });
});

describe('sombra del bloqueo y texto', () => {
  const shadow = (x1: number, w: number): BoardElement => ({ id: 's', kind: 'shadow', x1, y1: 4, x2: 3, y2: 4, startWidth: w, endWidth: 3 });
  const text = (x: number): BoardElement => ({ id: 't', kind: 'text', x, y: 1, text: 'Hola', size: 'M', color: '#0E1A2B' });

  it('interpola los extremos y el ancho de la sombra', () => {
    const [s] = interpolateFrames([shadow(8, 1)], [shadow(10, 2)], 0.5);
    expect(s).toMatchObject({ x1: 9, startWidth: 1.5, x2: 3 });
  });

  it('mueve el texto como cualquier elemento', () => {
    const [t] = interpolateFrames([text(0)], [text(4)], 0.25);
    expect(t).toMatchObject({ x: 1, text: 'Hola' });
  });
});

describe('playbackProgress', () => {
  const timing = { intro: 1000, move: 1000, hold: 500, outro: 1000 };

  it('pausa al principio, se mueve, pausa en cada paso y termina en el último', () => {
    expect(playbackProgress(500, 3, timing)).toBe(0);
    expect(playbackProgress(1500, 3, timing)).toBe(0.5);
    expect(playbackProgress(2200, 3, timing)).toBe(1); // pausa en el paso 2
    expect(playbackProgress(3000, 3, timing)).toBe(1.5);
    expect(playbackProgress(9999, 3, timing)).toBe(2);
  });

  it('calcula la duración total', () => {
    expect(playbackDuration(3, timing)).toBe(1000 + 2 * 1500 + 1000);
    expect(playbackDuration(1, timing)).toBe(2000);
  });
});
