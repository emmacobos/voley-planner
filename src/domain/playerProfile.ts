import { hasAttendance, mondayOf, playerSessionLoad } from './load';
import { todayISO } from './sessions';
import { playerStats, skillSummary } from './stats';
import type { PlayerStats } from './stats';
import type { Match, StatSkill, TrainingSession } from './types';

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export interface WeekLoad {
  weekStart: string;
  load: number;
  called: number;
  attended: number;
}

/** Carga y asistencia de las últimas `weeks` semanas (de la más vieja a la actual). */
export function weeklyLoads(playerId: string, sessions: TrainingSession[], today: Date = new Date(), weeks = 8): WeekLoad[] {
  const monday = mondayOf(today);
  const todayStr = todayISO(today);
  const mine = sessions.filter(
    (s) => hasAttendance(s) && s.date <= todayStr && s.playerIds.includes(playerId) && s.attendance?.[playerId] !== undefined,
  );
  return Array.from({ length: weeks }, (_, i) => {
    const start = todayISO(addDays(monday, -7 * (weeks - 1 - i)));
    const end = todayISO(addDays(monday, -7 * (weeks - 1 - i) + 6));
    const inWeek = mine.filter((s) => s.date >= start && s.date <= end);
    return {
      weekStart: start,
      load: inWeek.reduce((sum, s) => sum + playerSessionLoad(s, playerId), 0),
      called: inWeek.length,
      attended: inWeek.filter((s) => s.attendance?.[playerId]?.present).length,
    };
  });
}

/** Asistencia de toda la temporada (todas las sesiones con asistencia tomada). */
export function totalAttendance(playerId: string, sessions: TrainingSession[], today: Date = new Date()) {
  const todayStr = todayISO(today);
  const mine = sessions.filter(
    (s) => hasAttendance(s) && s.date <= todayStr && s.attendance?.[playerId] !== undefined,
  );
  const attended = mine.filter((s) => s.attendance?.[playerId]?.present).length;
  return { called: mine.length, attended, rate: mine.length ? Math.round((attended / mine.length) * 100) : null };
}

export interface MatchLine {
  match: Match;
  stats: PlayerStats;
}

/** Partidos con estadísticas en los que la jugadora tiene acciones anotadas (del más reciente al más viejo). */
export function playerMatches(playerId: string, matches: Match[]): MatchLine[] {
  return matches
    .filter((m) => m.stats?.events.length)
    .map((match) => ({ match, stats: playerStats(match.stats).find((p) => p.playerId === playerId) }))
    .filter((x): x is MatchLine => !!x.stats)
    .sort((a, b) => b.match.date.localeCompare(a.match.date));
}

/** Suma las estadísticas de varios partidos. */
export function sumStats(playerId: string, lines: PlayerStats[]): PlayerStats {
  const total: PlayerStats = { playerId, skills: {}, points: 0, errors: 0 };
  for (const s of lines) {
    total.points += s.points;
    total.errors += s.errors;
    for (const [skill, count] of Object.entries(s.skills) as [StatSkill, NonNullable<PlayerStats['skills'][StatSkill]>][]) {
      const t = (total.skills[skill] ??= { total: 0, by: {} });
      t.total += count.total;
      for (const [k, v] of Object.entries(count.by)) t.by[k] = (t.by[k] ?? 0) + v;
    }
  }
  return total;
}

/** Números principales de una línea de estadísticas, para mostrar en la ficha. */
export function keyNumbers(s: PlayerStats) {
  const serve = skillSummary('saque', s.skills.saque) as { total: number; main: number; errors: number };
  const reception = skillSummary('recepcion', s.skills.recepcion) as { total: number; positive: number | null };
  const attack = skillSummary('ataque', s.skills.ataque) as { total: number; main: number; efficiency: number | null };
  const block = skillSummary('bloqueo', s.skills.bloqueo) as { main: number };
  return { points: s.points, errors: s.errors, serve, reception, attack, block };
}
