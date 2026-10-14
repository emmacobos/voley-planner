import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demo';
import { contentRanking, exerciseContents, monthBounds, phaseOn, phaseWeeks, sessionsBetween, workSummary } from './season';
import type { Exercise, TrainingSession } from './types';

describe('plan de temporada', () => {
  it('deduce los contenidos de un ejercicio por su nombre y objetivo, salvo que estén marcados', () => {
    expect(exerciseContents({ name: 'K1 en R1: recepción, armado y ataque', objective: '' })).toEqual(['recepcion', 'armado', 'ataque']);
    expect(exerciseContents({ name: 'Saque táctico a zona 1', objective: '' })).toEqual(['saque']);
    expect(exerciseContents({ name: 'Cualquier cosa', objective: '', contents: ['bloqueo'] })).toEqual(['bloqueo']);
  });

  it('reparte los minutos entre los contenidos y suma los bloques libres', () => {
    const ex = { id: 'e1', name: 'Recepción y ataque', objective: '' } as Exercise;
    const session = {
      id: 's1',
      date: '2026-10-10',
      squadId: null,
      blocks: [
        { id: 'b1', kind: 'calentamiento', durationMin: 15, items: [], playerIds: [], title: '', notes: '' },
        { id: 'b2', kind: 'tecnica', durationMin: 0, items: [{ id: 'i1', exerciseId: 'e1', durationMin: 30 }], playerIds: [], title: '', notes: '' },
      ],
    } as unknown as TrainingSession;
    const summary = workSummary([session], [ex]);
    expect(summary.byContent).toEqual({ fisico: 15, recepcion: 15, ataque: 15 });
    expect(contentRanking(summary)[0]).toEqual({ key: 'fisico', minutes: 15, percent: 33 });
  });

  it('encuentra la etapa en curso y cuenta sus semanas', () => {
    const today = new Date(2026, 9, 14);
    const demo = buildDemoData(today);
    const current = phaseOn(demo.phases, '2026-10-14', demo.squads[0].id)!;
    expect(current.kind).toBe('competencia');
    expect(phaseWeeks(current)).toBe(13);
    expect(phaseOn(demo.phases, '2027-06-01', null)).toBeUndefined();
  });

  it('arma los límites del mes y filtra sesiones', () => {
    expect(monthBounds(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    const demo = buildDemoData(new Date(2026, 9, 14));
    const { from, to } = monthBounds(2026, 9);
    const inMonth = sessionsBetween(demo.sessions, from, to, null);
    expect(inMonth.every((s) => s.date >= from && s.date <= to)).toBe(true);
    expect(workSummary(inMonth, demo.exercises).minutes).toBeGreaterThan(0);
  });
});
