import { describe, expect, it } from 'vitest';
import { ARROW_KINDS, arrowColor, arrowDashed, arrowKind, arrowPath, curveThrough, headMarkerId, midPoint } from './arrows';

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

describe('tipos de flecha', () => {
  it('el tipo sale del trazo y de la curva', () => {
    expect(arrowKind({ style: 'move' })).toBe('desplazamiento');
    expect(arrowKind({ style: 'ball' })).toBe('pelota');
    expect(arrowKind({ style: 'ball', curve: 1.2 })).toBe('curva');
    expect(arrowKind({ style: 'move', curve: -0.8 })).toBe('curva-punteada');
  });

  it('cada tipo tiene un color distinto y su marcador', () => {
    const colors = ARROW_KINDS.map((k) => k.color);
    expect(new Set(colors).size).toBe(ARROW_KINDS.length);
    expect(arrowColor({ style: 'ball', curve: 2 })).toBe('#C0262D');
    expect(arrowColor({ style: 'move' })).toBe('#1F4FB8');
    expect(new Set(colors.map(headMarkerId)).size).toBe(colors.length);
  });

  it('las de desplazamiento son punteadas', () => {
    expect(arrowDashed({ style: 'move' })).toBe(true);
    expect(arrowDashed({ style: 'ball' })).toBe(false);
  });
});
