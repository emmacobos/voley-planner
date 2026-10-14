import { sessionDuration } from './sessions';
import type { BlockKind, Content, Exercise, Match, PhaseKind, SeasonPhase, TrainingSession } from './types';

/** Etapas de la temporada (macrociclo). */
export const PHASE_KINDS: { value: PhaseKind; label: string; color: string }[] = [
  { value: 'pretemporada', label: 'Pretemporada', color: '#b07a3c' },
  { value: 'competencia', label: 'Competencia', color: '#7a2232' },
  { value: 'puesta-a-punto', label: 'Puesta a punto', color: '#3e4a5a' },
  { value: 'transicion', label: 'Transición / descanso', color: '#8f8676' },
  { value: 'otro', label: 'Otra', color: '#6d7b4e' },
];

export const phaseKindInfo = (kind: PhaseKind) => PHASE_KINDS.find((k) => k.value === kind) ?? PHASE_KINDS[4];

/** Contenidos que se trabajan en un ejercicio (para medir cuánto se entrenó cada cosa). */
export const CONTENTS: { value: Content; label: string; color: string; keywords: string[] }[] = [
  { value: 'saque', label: 'Saque', color: '#b07a3c', keywords: ['saque', 'sacar', 'servicio'] },
  { value: 'recepcion', label: 'Recepción', color: '#3e4a5a', keywords: ['recepcion', 'recibir', 'k1', 'antebrazo'] },
  { value: 'armado', label: 'Armado', color: '#c39a55', keywords: ['armado', 'armar', 'armador', 'colocacion', 'dedos'] },
  { value: 'ataque', label: 'Ataque', color: '#7a2232', keywords: ['ataque', 'atacar', 'remate', 'rematar'] },
  { value: 'bloqueo', label: 'Bloqueo', color: '#2f3a4a', keywords: ['bloqueo', 'bloquear'] },
  { value: 'defensa', label: 'Defensa', color: '#6d7b4e', keywords: ['defensa', 'defender', 'k2', 'cobertura'] },
  { value: 'contraataque', label: 'Contraataque / transición', color: '#a0525f', keywords: ['contraataque', 'transicion'] },
  { value: 'fisico', label: 'Físico y calentamiento', color: '#8f8676', keywords: ['fisico', 'calentamiento', 'fuerza', 'saltos', 'velocidad'] },
  { value: 'juego', label: 'Juego / sistema', color: '#5f6b3f', keywords: ['juego', 'partido', 'sistema', '6 vs 6', '6x6', 'rotacion'] },
];

export const contentInfo = (c: Content) => CONTENTS.find((x) => x.value === c)!;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Contenidos de un ejercicio: los marcados a mano, o los que se deducen del nombre y el objetivo. */
export function exerciseContents(ex: Pick<Exercise, 'name' | 'objective'> & { contents?: Content[] }): Content[] {
  if (ex.contents?.length) return ex.contents;
  const text = normalize(`${ex.name} ${ex.objective}`);
  return CONTENTS.filter((c) => c.keywords.some((k) => text.includes(k))).map((c) => c.value);
}

/** Bloques sin ejercicios: a qué contenido se suman sus minutos. */
const BLOCK_CONTENT: Partial<Record<BlockKind, Content>> = {
  calentamiento: 'fisico',
  'vuelta-calma': 'fisico',
  juego: 'juego',
};

export type ContentKey = Content | 'otros';

export interface WorkSummary {
  sessions: number;
  minutes: number;
  byContent: Partial<Record<ContentKey, number>>;
}

/** Sesiones del plantel (o de todos) entre dos fechas, incluidas. */
export function sessionsBetween(sessions: TrainingSession[], from: string, to: string, squadId: string | null) {
  return sessions.filter((s) => s.date >= from && s.date <= to && (!squadId || s.squadId === squadId));
}

/**
 * Cuántos minutos se trabajó cada contenido. Si un ejercicio trabaja varios,
 * sus minutos se reparten en partes iguales.
 */
export function workSummary(sessions: TrainingSession[], exercises: Exercise[]): WorkSummary {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const byContent: Partial<Record<ContentKey, number>> = {};
  const add = (key: ContentKey, min: number) => {
    byContent[key] = (byContent[key] ?? 0) + min;
  };
  for (const session of sessions) {
    for (const block of session.blocks) {
      if (!block.items.length) {
        add(BLOCK_CONTENT[block.kind] ?? 'otros', block.durationMin);
        continue;
      }
      for (const item of block.items) {
        const ex = byId.get(item.exerciseId);
        const contents = ex ? exerciseContents(ex) : [];
        if (!contents.length) add(BLOCK_CONTENT[block.kind] ?? 'otros', item.durationMin);
        else for (const c of contents) add(c, item.durationMin / contents.length);
      }
    }
  }
  for (const k of Object.keys(byContent) as ContentKey[]) byContent[k] = Math.round(byContent[k]!);
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((a, s) => a + sessionDuration(s), 0),
    byContent,
  };
}

/** Contenidos ordenados de más a menos minutos, con su porcentaje. */
export function contentRanking(summary: WorkSummary) {
  const total = Object.values(summary.byContent).reduce((a, b) => a + (b ?? 0), 0);
  return (Object.entries(summary.byContent) as [ContentKey, number][])
    .filter(([, min]) => min > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, minutes]) => ({ key, minutes, percent: total ? Math.round((minutes / total) * 100) : 0 }));
}

/** Etapas que corresponden a un plantel (las de "todos" valen para cualquiera), ordenadas por fecha. */
export function phasesFor(phases: SeasonPhase[], squadId: string | null): SeasonPhase[] {
  return phases.filter((p) => !squadId || !p.squadId || p.squadId === squadId).sort((a, b) => a.start.localeCompare(b.start));
}

/** Etapa en curso en esa fecha. */
export function phaseOn(phases: SeasonPhase[], date: string, squadId: string | null): SeasonPhase | undefined {
  return phasesFor(phases, squadId).find((p) => p.start <= date && date <= p.end);
}

/** Partidos de la etapa: jugados, ganados y perdidos. */
export function phaseMatches(matches: Match[], phase: SeasonPhase, squadId: string | null) {
  const list = matches.filter(
    (m) => m.date >= phase.start && m.date <= phase.end && (!squadId || m.squadId === squadId) && (!phase.squadId || m.squadId === phase.squadId),
  );
  const played = list.filter((m) => /^\d+-\d+$/.test(m.result));
  const won = played.filter((m) => {
    const [a, b] = m.result.split('-').map(Number);
    return a > b;
  }).length;
  return { total: list.length, played: played.length, won, lost: played.length - won };
}

/** Semanas (redondeadas) que dura una etapa. */
export function phaseWeeks(phase: Pick<SeasonPhase, 'start' | 'end'>): number {
  const days = (Date.parse(`${phase.end}T00:00:00`) - Date.parse(`${phase.start}T00:00:00`)) / 86400000 + 1;
  return Math.max(1, Math.round(days / 7));
}

/** Primer y último día del mes (AAAA-MM-DD). */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const last = new Date(year, month + 1, 0).getDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` };
}
