import { describe, expect, it } from 'vitest';
import { emptyPlan, matchesAgainst, outcome, previousPlan } from './matches';
import type { Match } from './types';

const match = (id: string, opponent: string, date: string, plan?: Match['plan']): Match => ({
  id,
  squadId: null,
  date,
  time: '',
  opponent,
  home: true,
  venue: '',
  competition: '',
  notes: '',
  result: '',
  plan,
  createdAt: '',
  updatedAt: '',
});

describe('partidos y rivales', () => {
  const hoy = match('hoy', 'Náutico', '2026-10-17');
  const all = [
    hoy,
    match('ida', ' náutico ', '2026-05-02', { ...emptyPlan(), serve: 'Sacar a zona 1' }),
    match('vacio', 'Nautico FC', '2026-06-01', emptyPlan()),
    match('otro', 'Ferro', '2026-09-01', { ...emptyPlan(), keys: 'x' }),
  ];

  it('encuentra los partidos contra el mismo rival sin importar mayúsculas ni espacios', () => {
    expect(matchesAgainst(all, hoy).map((m) => m.id)).toEqual(['ida']);
  });

  it('propone el plan más reciente que tenga contenido', () => {
    expect(previousPlan(all, hoy)?.id).toBe('ida');
    expect(previousPlan(all, match('x', 'Ferro', '2026-10-01'))?.id).toBe('otro');
    expect(previousPlan(all, match('y', '', '2026-10-01'))).toBeUndefined();
  });

  it('lee el resultado en sets', () => {
    expect(outcome('3-1')).toBe('ganado');
    expect(outcome(' 1 - 3 ')).toBe('perdido');
    expect(outcome('25-20')).toBeNull();
    expect(outcome('')).toBeNull();
  });
});
