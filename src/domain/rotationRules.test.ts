import { describe, expect, it } from 'vitest';
import { roleTokenId, rotationTokens, zonesForRotation } from './rotations';
import { checkRotation } from './rotationRules';
import type { BoardElement, PlayerToken, Team, Zone } from './types';

const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];

function move(
  els: BoardElement[],
  id: string,
  pos: Partial<{ x: number; y: number }>,
): BoardElement[] {
  return els.map((e) => (e.id === id ? ({ ...e, ...pos } as BoardElement) : e));
}

function tokenInZone(els: BoardElement[], zone: Zone): PlayerToken {
  return els.find((e) => e.kind === 'player' && e.zone === zone) as PlayerToken;
}

describe('zonesForRotation', () => {
  it('ubica al armador en la zona de la rotación', () => {
    for (const z of ZONES) expect(zonesForRotation(z).S).toBe(z);
  });

  it('el opuesto queda siempre enfrentado al armador', () => {
    for (const z of ZONES) {
      const zones = zonesForRotation(z);
      expect(Math.abs(zones.OPP - zones.S)).toBe(3);
    }
  });
});

describe('checkRotation', () => {
  for (const team of ['A', 'B'] as Team[]) {
    for (const rot of ZONES) {
      it(`rotación ${rot} en posición base es válida (equipo ${team})`, () => {
        const result = checkRotation(rotationTokens(team, rot), team);
        expect(result.applicable).toBe(true);
        expect(result.faults).toEqual([]);
      });
    }

    it(`detecta zaguero delante de su delantero (equipo ${team})`, () => {
      const els = rotationTokens(team, 1);
      const z3 = tokenInZone(els, 3);
      const z6 = tokenInZone(els, 6);
      const swapped = move(move(els, z3.id, { x: z6.x }), z6.id, { x: z3.x });
      const result = checkRotation(swapped, team);
      expect(result.faults).toHaveLength(1);
      expect(result.faults[0]).toMatch(/Zona 3/);
    });

    it(`detecta orden lateral invertido (equipo ${team})`, () => {
      const els = rotationTokens(team, 1);
      const z5 = tokenInZone(els, 5);
      const z6 = tokenInZone(els, 6);
      const swapped = move(move(els, z5.id, { y: z6.y }), z6.id, { y: z5.y });
      const result = checkRotation(swapped, team);
      expect(result.faults.length).toBeGreaterThan(0);
      expect(result.faults.join(' ')).toMatch(/zona 6/);
    });
  }

  it('permite recepciones apiladas siempre que se respete el orden', () => {
    // Rotación 1 del equipo A: el armador (zona 1) se esconde detrás del punta de zona 2.
    let els: BoardElement[] = rotationTokens('A', 1);
    els = move(els, roleTokenId('A', 'S'), { x: 7, y: 8.5 });
    els = move(els, roleTokenId('A', 'OH1'), { x: 7.5, y: 8 });
    expect(checkRotation(els, 'A').faults).toEqual([]);
  });

  it('no aplica si faltan jugadores con zona', () => {
    const els = rotationTokens('A', 1).slice(0, 5);
    expect(checkRotation(els, 'A').applicable).toBe(false);
  });
});
