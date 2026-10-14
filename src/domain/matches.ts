import type { Match, MatchPlan } from './types';

const sameRival = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es') && a.trim() !== '';

/** Plan vacío para empezar a cargar el scouting. */
export function emptyPlan(): MatchPlan {
  return { keyPlayers: '', strengths: '', weaknesses: '', serve: '', defense: '', keys: '', frames: [] };
}

/** Partidos contra el mismo rival (sin contar `match`), del más reciente al más viejo. */
export function matchesAgainst(matches: Match[], match: Match): Match[] {
  return matches
    .filter((m) => m.id !== match.id && sameRival(m.opponent, match.opponent))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

/** El plan más reciente contra el mismo rival, para reusar el scouting. */
export function previousPlan(matches: Match[], match: Match): Match | undefined {
  return matchesAgainst(matches, match).find((m) => m.plan && hasContent(m.plan));
}

export function hasContent(plan: MatchPlan): boolean {
  return plan.frames.length > 0 || [plan.keyPlayers, plan.strengths, plan.weaknesses, plan.serve, plan.defense, plan.keys].some((t) => t.trim());
}

/** Resultado en sets ("3-1") desde nuestro lado: ganado, perdido o null si no se puede leer. */
export function outcome(result: string): 'ganado' | 'perdido' | null {
  const m = result.match(/^\s*(\d)\s*[-–a]\s*(\d)\s*$/);
  if (!m) return null;
  const [ours, theirs] = [Number(m[1]), Number(m[2])];
  if (ours === theirs) return null;
  return ours > theirs ? 'ganado' : 'perdido';
}
