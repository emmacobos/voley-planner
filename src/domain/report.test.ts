import { describe, expect, it } from 'vitest';
import { buildDemoData } from './demo';
import { matchKpis, playerCards, pointSources, previousWithStats, setMoments, suggestExercise, trends, workItems } from './report';
import type { Match, MatchStats, StatEvent } from './types';

let n = 0;
const ev = (e: Record<string, unknown>) => ({ id: `e${n++}`, ...e }) as StatEvent;
const accion = (playerId: string, skill: string, result: string) => ev({ type: 'accion', playerId, skill, result });
const rival = (result: 'punto' | 'error') => ev({ type: 'rival', result });
const set = (serving: 'nosotros' | 'rival' = 'nosotros', rotation = 1) => ev({ type: 'set', rotation, serving });

describe('informe del partido', () => {
  it('separa de dónde salieron los puntos de cada lado', () => {
    const stats: MatchStats = {
      events: [
        set(),
        accion('a', 'saque', 'ace'),
        accion('a', 'saque', 'error'),
        accion('b', 'recepcion', 'error'),
        accion('c', 'ataque', 'punto'),
        accion('c', 'ataque', 'bloqueado'),
        accion('c', 'ataque', 'error'),
        accion('d', 'bloqueo', 'punto'),
        accion('d', 'bloqueo', 'error'),
        rival('error'),
        rival('punto'),
      ],
    };
    const s = pointSources(stats);
    expect(s.ours).toEqual({ ataque: 1, saque: 1, bloqueo: 1, rivalError: 1, total: 4 });
    expect(s.theirs).toMatchObject({ rival: 1, blocked: 1, aces: 1, serveErrors: 1, attackErrors: 1, blockErrors: 1, ownErrors: 3, total: 6 });
  });

  it('encuentra las rachas y cómo fue el final del set', () => {
    // 3 seguidos nuestros, 2 del rival, y después hasta 25-19.
    const events: StatEvent[] = [set('nosotros', 1)];
    for (let i = 0; i < 3; i++) events.push(rival('error'));
    for (let i = 0; i < 2; i++) events.push(rival('punto'));
    for (let i = 0; i < 17; i++) events.push(rival('error'), rival('punto'));
    events.push(rival('error'), rival('error'), rival('error'), rival('error'), rival('error'));
    const [m] = setMoments({ events });
    expect(m).toMatchObject({ us: 25, them: 19, finished: true });
    expect(m.bestRun).toMatchObject({ length: 5, from: '20-19', to: '25-19' });
    expect(m.worstRun).toMatchObject({ length: 2, from: '3-0', to: '3-2' });
    // Desde que llegamos a 20 (20-18): el punto del rival y los 5 nuestros.
    expect(m.closing).toEqual({ from: 20, won: 5, played: 6 });
  });

  it('el set decisivo se mide desde los 10', () => {
    const events: StatEvent[] = [set(), set(), set()];
    expect(setMoments({ events }, 3)[2].closing.from).toBe(10);
    expect(setMoments({ events }, 5)[2].closing.from).toBe(20);
  });
});

describe('con el partido de ejemplo', () => {
  const demo = buildDemoData(new Date(2026, 10, 11));
  const match = demo.matches.filter((m) => m.stats).sort((a, b) => b.date.localeCompare(a.date))[0];

  it('arma una ficha por jugadora con lo bueno y lo que hay que trabajar', () => {
    const cards = playerCards(match.stats, demo.players);
    expect(cards.length).toBeGreaterThan(5);
    const lucia = cards.find((c) => demo.players.find((p) => p.id === c.playerId)?.name === 'Lucía Fernández')!;
    expect(lucia.balance).toBe(lucia.points - lucia.errors);
    expect(lucia.strengths[0]).toMatch(/Máxima anotadora/);
    expect(cards.every((c) => c.metrics.length <= 3)).toBe(true);
  });

  it('propone qué trabajar, de lo más urgente a lo menos, con un ejercicio', () => {
    const work = workItems(match.stats, demo.players);
    expect(work[0].title).toBe('Recepción y side-out en R4');
    expect(work.map((w) => w.severity)).toEqual([...work.map((w) => w.severity)].sort((a, b) => b - a));
    expect(suggestExercise(work[0], [])?.exercise.name).toMatch(/Recepción/);
  });

  it('compara con los partidos anteriores del plantel', () => {
    const previous = previousWithStats(demo.matches, match);
    expect(previous).toHaveLength(2);
    const t = trends(match, previous);
    expect(t.find((x) => x.id === 'sideOut')!.value).toBe(matchKpis(match.stats).sideOut);
    expect(t.every((x) => x.average !== null)).toBe(true);
  });

  it('un partido sin anteriores no tiene con qué comparar', () => {
    const solo: Match = { ...match, squadId: 'otro' };
    expect(previousWithStats(demo.matches, solo)).toHaveLength(0);
  });
});
