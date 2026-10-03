import { describe, expect, it } from 'vitest';
import { elementsAtProgress, interpolateFrames } from './animation';
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
