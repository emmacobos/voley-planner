import { describe, expect, it } from 'vitest';
import { DEMO_PREFIX, buildDemoData } from './demo';
import { checkRotation } from './rotationRules';
import { sessionDuration, todayISO } from './sessions';

describe('buildDemoData', () => {
  const today = new Date(2026, 9, 16); // viernes
  const data = buildDemoData(today);

  it('todos los ids empiezan con el prefijo de ejemplo', () => {
    const ids = [
      ...data.squads.map((x) => x.id),
      ...data.players.map((x) => x.id),
      ...data.exercises.flatMap((e) => [e.id, ...e.frames.flatMap((f) => [f.id, ...f.elements.map((el) => el.id)])]),
      ...data.sessions.flatMap((s) => [s.id, ...s.blocks.flatMap((b) => [b.id, ...b.items.map((i) => i.id)])]),
    ];
    expect(ids.every((x) => x.startsWith(DEMO_PREFIX) || /^[AB]-/.test(x))).toBe(true);
  });

  it('las referencias entre plantel, jugadoras, ejercicios y sesión son válidas', () => {
    const playerIds = new Set(data.players.map((p) => p.id));
    const exerciseIds = new Set(data.exercises.map((e) => e.id));
    expect(data.players.every((p) => p.squadId === data.squads[0].id)).toBe(true);
    for (const s of data.sessions) {
      expect(s.playerIds.every((p) => playerIds.has(p))).toBe(true);
      expect(s.blocks.flatMap((b) => b.items).every((i) => exerciseIds.has(i.exerciseId))).toBe(true);
    }
  });

  it('la sesión queda como próxima, en un día hábil, y dura 90 minutos', () => {
    const [s] = data.sessions;
    expect(s.date > todayISO(today)).toBe(true);
    expect(new Date(`${s.date}T00:00:00`).getDay()).toBe(1); // el lunes siguiente
    expect(sessionDuration(s)).toBe(90);
  });

  it('la jugada arranca en una recepción sin faltas de posición', () => {
    const play = data.exercises[0];
    expect(play.frames).toHaveLength(3);
    expect(checkRotation(play.frames[0].elements, 'A').faults).toEqual([]);
  });
});
