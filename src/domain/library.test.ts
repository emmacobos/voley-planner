import { describe, expect, it } from 'vitest';
import { LIBRARY } from './library';
import { checkRotation } from './rotationRules';
import { isSegment } from './types';

describe('ejercicios modelo', () => {
  it('hay ejercicios de los tres tipos y las claves no se repiten', () => {
    expect(new Set(LIBRARY.map((e) => e.type))).toEqual(new Set(['analitico', 'sintetico', 'global']));
    expect(new Set(LIBRARY.map((e) => e.key)).size).toBe(LIBRARY.length);
  });

  it('cada paso tiene ids únicos y todo queda dentro de la pizarra', () => {
    for (const ex of LIBRARY) {
      expect(ex.frames.length).toBeGreaterThan(0);
      expect(ex.notes).toMatch(/Consignas/);
      for (const f of ex.frames) {
        const ids = f.elements.map((e) => e.id);
        expect(new Set(ids).size, `${ex.name}: ids repetidos`).toBe(ids.length);
        for (const e of f.elements) {
          const points = isSegment(e) ? [[e.x1, e.y1], [e.x2, e.y2]] : 'x' in e ? [[e.x, e.y]] : [];
          for (const [x, y] of points) {
            expect(x, `${ex.name} ${e.id}`).toBeGreaterThanOrEqual(-3);
            expect(x, `${ex.name} ${e.id}`).toBeLessThanOrEqual(21);
            expect(y, `${ex.name} ${e.id}`).toBeGreaterThanOrEqual(-3);
            expect(y, `${ex.name} ${e.id}`).toBeLessThanOrEqual(12);
          }
        }
      }
    }
  });

  it('las recepciones con formación no tienen faltas de posición', () => {
    for (const ex of LIBRARY) {
      for (const f of ex.frames.filter((fr) => fr.situation === 'saque-B')) {
        const tokens = f.elements.filter((e) => e.kind === 'player' && e.team === 'A' && e.zone);
        if (tokens.length === 6) expect(checkRotation(f.elements, 'A').faults, `${ex.name}: ${f.note}`).toEqual([]);
      }
    }
  });
});
