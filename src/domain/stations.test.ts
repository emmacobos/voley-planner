import { describe, expect, it } from 'vitest';
import { autoGroups, courtOfGroup, fillCourtWithGroup, groupAtCourt, makeGroups, movePlayer, reshuffleGroups, rotationTable } from './stations';
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

describe('cambiar los grupos', () => {
  const players = Array.from({ length: 12 }, (_, i) =>
    player(i + 1, (['armador', 'opuesto', 'punta', 'punta', 'central', 'central'] as Position[])[i % 6]),
  );
  let n = 0;
  const groups = makeGroups(players, 3, () => `g${n++}`).map((g, i) => ({ ...g, name: `Equipo ${i}` }));

  it('repartir de nuevo cambia el reparto, sigue parejo y conserva nombres y colores', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const next = reshuffleGroups(groups, players, random);
    expect(next.map((g) => g.name)).toEqual(groups.map((g) => g.name));
    expect(next.map((g) => g.color)).toEqual(groups.map((g) => g.color));
    expect(next.map((g) => g.playerIds.length)).toEqual([4, 4, 4]);
    expect(next.flatMap((g) => g.playerIds).sort()).toEqual(players.map((p) => p.id).sort());
    expect(next.map((g) => g.playerIds.slice().sort().join())).not.toEqual(groups.map((g) => g.playerIds.slice().sort().join()));
  });

  it('pasa una jugadora a otro grupo', () => {
    const id = groups[0].playerIds[0];
    const moved = movePlayer(groups, id, groups[2].id);
    expect(moved[0].playerIds).not.toContain(id);
    expect(moved[2].playerIds.at(-1)).toBe(id);
    expect(moved[1]).toBe(groups[1]);
  });
});

describe('las fichas de cada cancha con el grupo que está ahí', () => {
  const ps = [1, 2, 3, 4, 5, 6].map((n) => player(n, 'punta'));
  const home = ['p1', 'p2', 'p3'];
  const next = ['p4', 'p5', 'p6'];
  const tokens = [
    // La entrenadora puso a la 3 en esta ficha del equipo A…
    { id: 't1', kind: 'player' as const, team: 'A' as const, label: '3', playerId: 'p3', x: 2, y: 2 },
    // …y estas dos quedaron sin jugadora (una es del equipo B).
    { id: 't2', kind: 'player' as const, team: 'A' as const, label: '1', x: 3, y: 3 },
    { id: 't3', kind: 'player' as const, team: 'B' as const, label: '1', x: 12, y: 3 },
    { id: 'pelota', kind: 'ball' as const, x: 9, y: 4 },
  ];

  it('en la primera vuelta respeta lo acomodado y completa el resto (también el equipo B)', () => {
    const shown = fillCourtWithGroup(tokens, home, home, ps);
    expect(shown.map((e) => (e.kind === 'player' ? e.playerId : e.kind))).toEqual(['p3', 'p1', 'p2', 'ball']);
  });

  it('al rotar, cada lugar lo ocupa la jugadora en ese lugar del grupo que llegó', () => {
    const shown = fillCourtWithGroup(tokens, home, next, ps);
    expect(shown.map((e) => (e.kind === 'player' ? e.playerId : e.kind))).toEqual(['p6', 'p4', 'p5', 'ball']);
    expect(shown[0]).toMatchObject({ label: '6', x: 2, y: 2 });
  });

  it('si el grupo que llega tiene menos jugadoras, las fichas que sobran quedan sin nombre', () => {
    const shown = fillCourtWithGroup(tokens, home, ['p4'], ps);
    expect(shown.map((e) => (e.kind === 'player' ? e.playerId : e.kind))).toEqual([undefined, 'p4', undefined, 'ball']);
  });
});
