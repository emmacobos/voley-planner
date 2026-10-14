import { describe, expect, it } from 'vitest';
import { nextRotation, playerStats, replay, rotationStats, setFinished, setsResult, skillSummary } from './stats';
import type { MatchStats, StatEvent, StatSkill } from './types';

let n = 0;
const id = () => `e${n++}`;
const set = (rotation: number, serving: 'nosotros' | 'rival'): StatEvent => ({ id: id(), type: 'set', rotation, serving });
const act = (playerId: string, skill: StatSkill, result: string): StatEvent => ({
  id: id(),
  type: 'accion',
  playerId,
  skill,
  result,
});
const rival = (result: 'error' | 'punto'): StatEvent => ({ id: id(), type: 'rival', result });

describe('estadísticas de partido', () => {
  it('la rotación avanza del armador en 1 al 6, al 5…', () => {
    expect([1, 6, 5, 4, 3, 2].map(nextRotation)).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('lleva el marcador, el saque y rota al recuperar el saque', () => {
    const stats: MatchStats = {
      events: [
        set(1, 'rival'),
        act('ana', 'recepcion', 'perfecta'),
        act('bea', 'ataque', 'punto'), // side-out: 1-0, rotamos a R6 y sacamos
        act('caro', 'saque', 'error'), // 1-1, saca el rival
        rival('error'), // 2-1, rotamos a R5
        act('dani', 'saque', 'ace'), // 3-1, seguimos en R5
      ],
    };
    const s = replay(stats);
    expect(s.current).toMatchObject({ number: 1, us: 3, them: 1 });
    expect(s.rotation).toBe(5);
    expect(s.serving).toBe('nosotros');
    expect(s.points.map((p) => [p.rotation, p.serving, p.winner])).toEqual([
      [1, 'rival', 'nosotros'],
      [6, 'nosotros', 'rival'],
      [6, 'rival', 'nosotros'],
      [5, 'nosotros', 'nosotros'],
    ]);
  });

  it('las acciones que no cierran el punto no cambian el marcador', () => {
    const s = replay({ events: [set(3, 'nosotros'), act('ana', 'saque', 'en-juego'), act('bea', 'defensa', 'levantada')] });
    expect(s.current).toMatchObject({ us: 0, them: 0 });
    expect(s.rotation).toBe(3);
  });

  it('sabe cuándo termina un set y arma el resultado', () => {
    expect(setFinished({ number: 1, us: 25, them: 23 })).toBe(true);
    expect(setFinished({ number: 1, us: 25, them: 24 })).toBe(false);
    expect(setFinished({ number: 5, us: 15, them: 10 })).toBe(true);
    expect(setsResult([
      { number: 1, us: 25, them: 20 },
      { number: 2, us: 18, them: 25 },
      { number: 3, us: 25, them: 22 },
      { number: 4, us: 10, them: 12 },
    ])).toBe('2-1');
  });

  it('resume por jugadora y por rotación', () => {
    const stats: MatchStats = {
      events: [
        set(1, 'rival'),
        act('ana', 'recepcion', 'perfecta'),
        act('bea', 'ataque', 'punto'),
        act('bea', 'saque', 'ace'),
        act('bea', 'saque', 'error'),
        act('ana', 'recepcion', 'error'),
      ],
    };
    const players = playerStats(stats);
    const bea = players.find((p) => p.playerId === 'bea')!;
    expect(bea.points).toBe(2);
    expect(bea.errors).toBe(1);
    expect(skillSummary('saque', bea.skills.saque)).toMatchObject({ total: 2, main: 1, errors: 1, efficiency: 0 });
    const ana = players.find((p) => p.playerId === 'ana')!;
    expect(skillSummary('recepcion', ana.skills.recepcion)).toMatchObject({ total: 2, perfect: 50, positive: 50, errors: 1 });

    const rows = rotationStats(replay(stats));
    const r1 = rows.find((r) => r.rotation === 1)!;
    expect(r1).toMatchObject({ won: 1, receiving: 1, sideOut: 1 });
    const r6 = rows.find((r) => r.rotation === 6)!;
    // Ace (break), error de saque y recepción errada.
    expect(r6).toMatchObject({ won: 1, lost: 2, serving: 2, breaks: 1, receiving: 1, sideOut: 0 });
  });

  it('filtra por set', () => {
    const stats: MatchStats = {
      events: [set(1, 'nosotros'), act('ana', 'saque', 'ace'), set(1, 'nosotros'), act('ana', 'saque', 'error')],
    };
    expect(playerStats(stats, 1)[0].points).toBe(1);
    expect(playerStats(stats, 2)[0].errors).toBe(1);
    expect(replay(stats).sets).toHaveLength(2);
  });
});

describe('partido de ejemplo', () => {
  it('tiene un partido jugado con estadísticas coherentes', async () => {
    const { buildDemoData } = await import('./demo');
    const played = buildDemoData(new Date(2026, 9, 14)).matches.find((m) => m.stats)!;
    const state = replay(played.stats);
    expect(played.result).toBe(setsResult(state.sets));
    expect(state.sets.every(setFinished)).toBe(true);
    expect(playerStats(played.stats).length).toBeGreaterThan(5);
  });
});
