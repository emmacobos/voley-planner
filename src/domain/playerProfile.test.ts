import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demo';
import { keyNumbers, playerMatches, sumStats, totalAttendance, weeklyLoads } from './playerProfile';

const today = new Date(2026, 9, 14);
const demo = buildDemoData(today);
const sofia = demo.players.find((p) => p.number === 1)!;
const lucia = demo.players.find((p) => p.number === 5)!;

describe('ficha de la jugadora', () => {
  it('arma la carga de las últimas semanas, de la más vieja a la actual', () => {
    const weeks = weeklyLoads(sofia.id, demo.sessions, today, 8);
    expect(weeks).toHaveLength(8);
    expect(weeks[0].weekStart < weeks[7].weekStart).toBe(true);
    // El ejemplo tiene sesiones con asistencia y esfuerzo en las últimas semanas.
    expect(weeks.reduce((a, w) => a + w.load, 0)).toBeGreaterThan(0);
  });

  it('cuenta la asistencia de toda la temporada', () => {
    const a = totalAttendance(sofia.id, demo.sessions, today);
    expect(a.called).toBeGreaterThan(0);
    expect(a.rate).not.toBeNull();
  });

  it('junta las estadísticas de los partidos', () => {
    const lines = playerMatches(lucia.id, demo.matches);
    expect(lines).toHaveLength(1);
    const total = sumStats(lucia.id, lines.map((l) => l.stats));
    expect(total.points).toBe(lines[0].stats.points);
    expect(keyNumbers(total).attack.total).toBeGreaterThan(0);
    // Dos veces el mismo partido suma el doble.
    expect(sumStats(lucia.id, [lines[0].stats, lines[0].stats]).points).toBe(lines[0].stats.points * 2);
  });
});
