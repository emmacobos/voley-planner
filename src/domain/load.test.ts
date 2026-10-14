import { describe, expect, it } from 'vitest';
import { playerLoadReports, playerSessionLoad, sessionAttendanceSummary } from './load';
import type { Player, TrainingSession } from './types';

const ana: Player = { id: 'ana', squadId: 'q', name: 'Ana', number: 1, position: 'punta' };
const bea: Player = { id: 'bea', squadId: 'q', name: 'Bea', number: 2, position: 'central' };

function session(date: string, minutes: number, attendance: TrainingSession['attendance']): TrainingSession {
  return {
    id: date,
    name: date,
    date,
    time: '19:00',
    squadId: 'q',
    objective: '',
    notes: '',
    playerIds: ['ana', 'bea'],
    blocks: [{ id: 'b', kind: 'juego', title: 'Juego', durationMin: minutes, items: [], playerIds: [], notes: '' }],
    attendance,
    createdAt: '',
    updatedAt: '',
  };
}

describe('carga y asistencia', () => {
  it('la carga es RPE × minutos, y 0 si no vino o no respondió', () => {
    const s = session('2026-10-12', 90, { ana: { present: true, rpe: 6 }, bea: { present: false } });
    expect(playerSessionLoad(s, 'ana')).toBe(540);
    expect(playerSessionLoad(s, 'bea')).toBe(0);
  });

  it('resume presentes, RPE y carga promedio de la sesión', () => {
    const s = session('2026-10-12', 60, { ana: { present: true, rpe: 6 }, bea: { present: true, rpe: 8 } });
    expect(sessionAttendanceSummary(s)).toEqual({ called: 2, present: 2, avgRpe: 7, avgLoad: 420 });
  });

  it('avisa cuando la carga de la semana se dispara y cuando falta seguido', () => {
    const today = new Date(2026, 9, 16); // viernes 16/10
    const sessions = [
      // Tres semanas anteriores: 300 UA por semana para Ana.
      session('2026-09-22', 60, { ana: { present: true, rpe: 5 }, bea: { present: true, rpe: 5 } }),
      session('2026-09-29', 60, { ana: { present: true, rpe: 5 }, bea: { present: true, rpe: 5 } }),
      session('2026-10-06', 60, { ana: { present: true, rpe: 5 }, bea: { present: false } }),
      // Esta semana: 2 sesiones duras para Ana; Bea falta otra vez.
      session('2026-10-13', 90, { ana: { present: true, rpe: 7 }, bea: { present: false } }),
      session('2026-10-15', 60, { ana: { present: true, rpe: 6 } }),
      // Una sesión futura no cuenta.
      session('2026-10-20', 90, { ana: { present: true, rpe: 10 } }),
    ];
    const [a, b] = playerLoadReports([ana, bea], sessions, today);
    expect(a.weekLoad).toBe(7 * 90 + 6 * 60);
    expect(a.prevAvgLoad).toBe(300);
    expect(a.alerts[0]).toMatch(/subió 230 %/);
    expect(a.attendanceRate).toBe(100);
    expect(b.alerts).toContain('Faltó a las últimas 2 sesiones.');
  });

  it('sin asistencia tomada no hay datos ni avisos', () => {
    const [a] = playerLoadReports([ana], [session('2026-10-12', 90, undefined)], new Date(2026, 9, 16));
    expect(a.attendanceRate).toBeNull();
    expect(a.alerts).toEqual([]);
  });
});
