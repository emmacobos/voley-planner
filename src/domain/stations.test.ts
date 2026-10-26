import { describe, expect, it } from 'vitest';
import { autoGroups, courtOfGroup, groupAtCourt, makeGroups, rotationTable } from './stations';
import type { Player, Position } from './types';

const player = (n: number, position: Position): Player => ({ id: `p${n}`, squadId: 's', name: `J${n}`, number: n, position });

describe('circuito por estaciones', () => {
  it('cada vuelta, cada grupo pasa a la cancha siguiente', () => {
    const groups = ['rojo', 'negro', 'verde'];
    expect([0, 1, 2].map((c) => groupAtCourt(groups, 3, 0, c))).toEqual(['rojo', 'negro', 'verde']);
    expect([0, 1, 2].map((c) => groupAtCourt(groups, 3, 1, c))).toEqual(['verde', 'rojo', 'negro']);
    expect(courtOfGroup(0, 3, 1)).toBe(1);
    expect(courtOfGroup(2, 3, 1)).toBe(0);
    // Después de tantas vueltas como canchas, vuelven al principio.
    expect(rotationTable(groups, 3)).toEqual([
      ['rojo', 'negro', 'verde'],
      ['verde', 'rojo', 'negro'],
      ['negro', 'verde', 'rojo'],
    ]);
  });

  it('con menos grupos que canchas, alguna cancha queda libre', () => {
    expect([0, 1, 2].map((c) => groupAtCourt(['a', 'b'], 3, 0, c))).toEqual(['a', 'b', undefined]);
  });

  it('reparte parejo y mezcla los puestos', () => {
    const players = [
      player(1, 'armador'),
      player(8, 'armador'),
      player(2, 'opuesto'),
      player(3, 'punta'),
      player(4, 'punta'),
      player(9, 'punta'),
      player(5, 'central'),
      player(6, 'central'),
      player(7, 'libero'),
    ];
    const groups = autoGroups(players, 3);
    expect(groups.map((g) => g.length)).toEqual([3, 3, 3]);
    expect(groups.flat().sort()).toEqual(players.map((p) => p.id).sort());
    // Las dos armadoras quedan en grupos distintos.
    expect(groups.filter((g) => g.includes('p1') || g.includes('p8'))).toHaveLength(2);
    let n = 0;
    const made = makeGroups(players, 3, () => `g${n++}`);
    expect(made.map((g) => g.name)).toEqual(['Grupo 1', 'Grupo 2', 'Grupo 3']);
    expect(new Set(made.map((g) => g.color)).size).toBe(3);
  });
});
