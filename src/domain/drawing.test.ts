import { describe, expect, it } from 'vitest';
import { drawPath, moveStroke, simplifyStroke, strokeBounds, strokeLength, strokeWidth } from './drawing';

describe('lápiz (dibujo libre)', () => {
  it('guarda menos puntos, redondeados, sin perder el principio ni el final', () => {
    const raw = [
      { x: 1, y: 1 },
      { x: 1.01, y: 1.01 },
      { x: 1.02, y: 1 },
      { x: 1.5, y: 1.333 },
      { x: 1.52, y: 1.34 },
    ];
    expect(simplifyStroke(raw)).toEqual([1, 1, 1.5, 1.33, 1.52, 1.34]);
  });

  it('mide el largo del trazo', () => {
    expect(strokeLength([0, 0, 3, 4, 3, 5])).toBe(6);
    expect(strokeLength([2, 2])).toBe(0);
  });

  it('dibuja el trazo suavizado', () => {
    expect(drawPath([0, 0, 1, 1])).toBe('M0,0 L1,1');
    expect(drawPath([0, 0, 1, 1, 2, 0])).toBe('M0,0 Q1,1 1.5,0.5 L2,0');
  });

  it('se mueve entero y tiene un grosor por defecto', () => {
    expect(moveStroke({ points: [0, 0, 1, 2] }, 0.5, -1).points).toEqual([0.5, -1, 1.5, 1]);
    expect(strokeBounds([3, 1, 1, 4, 2, 2])).toEqual({ x1: 1, y1: 1, x2: 3, y2: 4 });
    expect(strokeWidth({})).toBe(0.12);
  });
});
