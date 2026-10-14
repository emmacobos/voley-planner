import { describe, expect, it } from 'vitest';
import { arrowPath, curveThrough, midPoint } from './arrows';

const straight = { x1: 0, y1: 0, x2: 4, y2: 0 };

describe('flechas curvas', () => {
  it('una flecha sin curva es una recta', () => {
    expect(arrowPath(straight)).toBe('M0,0 L4,0');
    expect(midPoint(straight)).toEqual({ x: 2, y: 0 });
  });

  it('el punto medio de la curva queda a la distancia indicada', () => {
    const p = midPoint({ ...straight, curve: 1.5 });
    expect(p.x).toBeCloseTo(2);
    expect(Math.abs(p.y)).toBeCloseTo(1.5);
    expect(arrowPath({ ...straight, curve: 1.5 })).toMatch(/^M0,0 Q/);
  });

  it('arrastrar el punto medio calcula la curva y vuelve al mismo lugar', () => {
    const a = { x1: 1, y1: 1, x2: 5, y2: 4 };
    const target = { x: 2, y: 4 };
    const curve = curveThrough(a, target);
    const p = midPoint({ ...a, curve });
    // El punto medio queda sobre la perpendicular que pasa por el destino.
    const n = { x: -3 / 5, y: 4 / 5 };
    expect((p.x - 3) * n.x + (p.y - 2.5) * n.y).toBeCloseTo((target.x - 3) * n.x + (target.y - 2.5) * n.y, 1);
  });

  it('cerca de la recta vuelve a quedar recta', () => {
    expect(curveThrough(straight, { x: 2, y: 0.05 })).toBe(0);
  });
});
