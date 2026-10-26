import { describe, expect, it } from 'vitest';
import { MAIN_COURT, courtLabel, courtProgress, exerciseCourts, sharedStepCount, updateCourt } from './courts';
import type { ExtraCourt, Frame } from './types';

const frame = (id: string): Frame => ({ id, note: '', situation: 'juego', elements: [] });

describe('varias canchas en un ejercicio', () => {
  const extra: ExtraCourt = { id: 'c2', name: 'Ataque', half: true, frames: [frame('a'), frame('b'), frame('c')] };
  const ex = { frames: [frame('1')], teamNames: { A: 'Nosotras' }, extraCourts: [extra] };

  it('la cancha principal es la de siempre y las extra van después', () => {
    const courts = exerciseCourts(ex);
    expect(courts.map((c) => c.id)).toEqual([MAIN_COURT, 'c2']);
    expect(courts[0].frames).toBe(ex.frames);
    expect(courts[0].teamNames).toEqual({ A: 'Nosotras' });
    expect(courtLabel(courts[0], 0)).toBe('Cancha 1');
    expect(courtLabel(courts[1], 1)).toBe('Ataque');
  });

  it('un ejercicio sin canchas extra tiene una sola', () => {
    expect(exerciseCourts({ frames: [frame('1')] })).toHaveLength(1);
  });

  it('guarda los cambios de cada cancha donde corresponde', () => {
    expect(updateCourt(ex, MAIN_COURT, { half: true, name: 'Saque' })).toEqual({ mainCourt: { half: true, name: 'Saque' } });
    expect(updateCourt(ex, MAIN_COURT, { frames: [] })).toEqual({ frames: [] });
    expect(updateCourt(ex, MAIN_COURT, { teamNames: { B: 'Rival' } })).toEqual({ teamNames: { B: 'Rival' } });
    expect(updateCourt(ex, 'c2', { name: 'Bloqueo' }).extraCourts![0]).toMatchObject({ id: 'c2', name: 'Bloqueo', half: true });
  });

  it('juntas se reproducen hasta el último paso de la que tiene más', () => {
    const courts = exerciseCourts(ex);
    expect(sharedStepCount(courts)).toBe(3);
    expect(courtProgress(courts[0], 2)).toBe(0);
    expect(courtProgress(courts[1], 1.5)).toBe(1.5);
  });
});
