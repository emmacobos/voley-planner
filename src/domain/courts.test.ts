import { describe, expect, it } from 'vitest';
import { MAIN_COURT, courtLabel, courtProgress, cutToHalfCourt, exerciseCourts, halfCourtLosses, sharedStepCount, updateCourt } from './courts';
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

describe('pasar a media cancha', () => {
  it('saca lo que queda del otro lado de la red, en todos los pasos', () => {
    const frames: Frame[] = [
      {
        id: 'f1',
        note: '',
        situation: 'juego',
        elements: [
          { id: 'a', kind: 'player', team: 'A', label: '1', x: 4, y: 3 },
          { id: 'b', kind: 'player', team: 'B', label: '1', x: 14, y: 3 },
          { id: 'red', kind: 'player', team: 'B', label: '2', x: 9.5, y: 3 },
          { id: 'f', kind: 'arrow', style: 'ball', x1: 3, y1: 2, x2: 15, y2: 2 },
        ],
      },
      { id: 'f2', note: '', situation: 'juego', elements: [{ id: 'b', kind: 'player', team: 'B', label: '1', x: 13, y: 4 }] },
    ];
    expect(halfCourtLosses(frames)).toBe(3);
    const cut = cutToHalfCourt(frames);
    expect(cut.removed).toBe(4);
    // También la jugadora pegada a la red del otro lado: no queda colgada en el borde.
    expect(cut.frames[0].elements.map((e) => e.id)).toEqual(['a']);
    expect(cut.frames[1].elements).toEqual([]);
  });
});
