import { describe, expect, it } from 'vitest';
import { ARROW_COLORS, arrowColor, arrowDashed, arrowPath, curveThrough, headMarkerId, midPoint } from './arrows';

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

describe('estilo de las flechas', () => {
  it('sin elección, el color es azul marino y el trazo depende del tipo', () => {
    expect(arrowColor({ style: 'move' })).toBe('#0E1A2B');
    expect(arrowColor({ style: 'ball' })).toBe('#0E1A2B');
    expect(arrowDashed({ style: 'move' })).toBe(true);
    expect(arrowDashed({ style: 'ball' })).toBe(false);
  });

  it('respeta el color y el trazo elegidos', () => {
    expect(arrowColor({ style: 'move', color: '#C0262D' })).toBe('#C0262D');
    expect(arrowDashed({ style: 'ball', dashed: true })).toBe(true);
    expect(arrowDashed({ style: 'move', dashed: false })).toBe(false);
  });

  it('cada color de la paleta tiene su marcador', () => {
    const ids = ARROW_COLORS.map((c) => headMarkerId(c.value));
    expect(new Set(ids).size).toBe(ARROW_COLORS.length);
    expect(headMarkerId('#F5B82E')).toBe('head-f5b82e');
  });
});
