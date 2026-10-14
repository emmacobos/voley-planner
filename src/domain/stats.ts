import type { MatchStats, StatEvent, StatSkill } from './types';

/**
 * Estadísticas de partido: se anota cada acción (quién, qué fundamento y cómo
 * salió) y de ahí sale el marcador, quién saca, en qué rotación estamos y los
 * resúmenes por jugadora y por rotación.
 */

export type Side = 'nosotros' | 'rival';

export interface ResultOption {
  id: string;
  label: string;
  /** Si la acción cierra el punto, para quién es. */
  point?: Side;
  tone: 'punto' | 'bueno' | 'neutro' | 'error';
  hint: string;
}

export const SKILLS: { id: StatSkill; label: string; results: ResultOption[] }[] = [
  {
    id: 'saque',
    label: 'Saque',
    results: [
      { id: 'ace', label: 'Ace', point: 'nosotros', tone: 'punto', hint: 'Punto directo de saque' },
      { id: 'complica', label: 'Complica', tone: 'bueno', hint: 'El rival recibe mal y no puede armar bien' },
      { id: 'en-juego', label: 'En juego', tone: 'neutro', hint: 'El rival recibe bien' },
      { id: 'error', label: 'Error', point: 'rival', tone: 'error', hint: 'A la red o afuera' },
    ],
  },
  {
    id: 'recepcion',
    label: 'Recepción',
    results: [
      { id: 'perfecta', label: 'Perfecta', tone: 'punto', hint: 'Al armador, con todas las opciones de ataque (#)' },
      { id: 'buena', label: 'Buena', tone: 'bueno', hint: 'Se puede armar, con menos opciones (+)' },
      { id: 'mala', label: 'Mala', tone: 'neutro', hint: 'Sale la pelota pero solo con un ataque forzado (−)' },
      { id: 'error', label: 'Error', point: 'rival', tone: 'error', hint: 'Ace del rival' },
    ],
  },
  {
    id: 'ataque',
    label: 'Ataque',
    results: [
      { id: 'punto', label: 'Punto', point: 'nosotros', tone: 'punto', hint: 'Ataque que termina en punto' },
      { id: 'en-juego', label: 'En juego', tone: 'neutro', hint: 'El rival defiende y sigue la jugada' },
      { id: 'bloqueado', label: 'Bloqueado', point: 'rival', tone: 'error', hint: 'Punto de bloqueo del rival' },
      { id: 'error', label: 'Error', point: 'rival', tone: 'error', hint: 'Afuera, a la red o falta' },
    ],
  },
  {
    id: 'bloqueo',
    label: 'Bloqueo',
    results: [
      { id: 'punto', label: 'Punto', point: 'nosotros', tone: 'punto', hint: 'Bloqueo que termina en punto' },
      { id: 'toque', label: 'Toque', tone: 'bueno', hint: 'Amortigua y sigue la jugada' },
      { id: 'error', label: 'Error', point: 'rival', tone: 'error', hint: 'Toque de red, invasión o la pelota va afuera' },
    ],
  },
  {
    id: 'defensa',
    label: 'Defensa',
    results: [
      { id: 'levantada', label: 'Levantada', tone: 'bueno', hint: 'Defiende y se puede seguir jugando' },
      { id: 'error', label: 'Error', point: 'rival', tone: 'error', hint: 'No llega o la manda afuera' },
    ],
  },
];

export const skillInfo = (skill: StatSkill) => SKILLS.find((s) => s.id === skill)!;
export const resultInfo = (skill: StatSkill, result: string) => skillInfo(skill).results.find((r) => r.id === result);

/** Rotación siguiente: el armador pasa de la zona 1 a la 6, de la 6 a la 5, etc. */
export const nextRotation = (rotation: number) => (rotation === 1 ? 6 : rotation - 1);

/** Para quién es el punto que cierra este evento (si lo cierra). */
export function eventPoint(e: StatEvent): Side | null {
  if (e.type === 'rival') return e.result === 'error' ? 'nosotros' : 'rival';
  if (e.type === 'accion') return resultInfo(e.skill, e.result)?.point ?? null;
  return null;
}

export interface PointRecord {
  set: number;
  rotation: number;
  /** Quién sacaba en ese punto. */
  serving: Side;
  winner: Side;
}

export interface SetScore {
  number: number;
  us: number;
  them: number;
}

export interface MatchState {
  sets: SetScore[];
  /** Set en juego (el último), o null si todavía no empezó ninguno. */
  current: SetScore | null;
  rotation: number;
  serving: Side;
  points: PointRecord[];
  /** Rotación de cada acción, en el mismo orden que los eventos (null si no es una acción). */
  rotations: (number | null)[];
}

/** Recorre los eventos y calcula marcador, saque y rotación. */
export function replay(stats: MatchStats | undefined): MatchState {
  const state: MatchState = { sets: [], current: null, rotation: 1, serving: 'nosotros', points: [], rotations: [] };
  for (const e of stats?.events ?? []) {
    if (e.type === 'set') {
      const set = { number: state.sets.length + 1, us: 0, them: 0 };
      state.sets.push(set);
      state.current = set;
      state.rotation = e.rotation;
      state.serving = e.serving;
      state.rotations.push(null);
      continue;
    }
    if (e.type === 'rotacion') {
      state.rotation = e.rotation;
      state.rotations.push(null);
      continue;
    }
    state.rotations.push(e.type === 'accion' ? state.rotation : null);
    const winner = eventPoint(e);
    if (!winner || !state.current) continue;
    state.points.push({ set: state.current.number, rotation: state.rotation, serving: state.serving, winner });
    if (winner === 'nosotros') {
      state.current.us++;
      // Recuperamos el saque: rotamos.
      if (state.serving === 'rival') state.rotation = nextRotation(state.rotation);
      state.serving = 'nosotros';
    } else {
      state.current.them++;
      state.serving = 'rival';
    }
  }
  return state;
}

/** Si el set ya está terminado (25 puntos, o 15 en el quinto, con 2 de diferencia). */
export function setFinished(set: SetScore): boolean {
  const target = set.number === 5 ? 15 : 25;
  return Math.max(set.us, set.them) >= target && Math.abs(set.us - set.them) >= 2;
}

/** Resultado en sets, por ejemplo "3-1" (cuenta solo los sets terminados). */
export function setsResult(sets: SetScore[]): string {
  const done = sets.filter(setFinished);
  const won = done.filter((s) => s.us > s.them).length;
  return `${won}-${done.length - won}`;
}

export interface SkillCount {
  total: number;
  /** Cantidad por resultado. */
  by: Record<string, number>;
}

export interface PlayerStats {
  playerId: string | null;
  skills: Partial<Record<StatSkill, SkillCount>>;
  /** Puntos ganados (ace, ataque y bloqueo) y errores que dieron punto al rival. */
  points: number;
  errors: number;
}

/** Acciones de cada jugadora (solo del set elegido, si se indica). */
export function playerStats(stats: MatchStats | undefined, set?: number): PlayerStats[] {
  const byPlayer = new Map<string | null, PlayerStats>();
  let currentSet = 0;
  for (const e of stats?.events ?? []) {
    if (e.type === 'set') currentSet++;
    if (e.type !== 'accion' || (set && currentSet !== set)) continue;
    const ps = byPlayer.get(e.playerId) ?? { playerId: e.playerId, skills: {}, points: 0, errors: 0 };
    const count = (ps.skills[e.skill] ??= { total: 0, by: {} });
    count.total++;
    count.by[e.result] = (count.by[e.result] ?? 0) + 1;
    const point = eventPoint(e);
    if (point === 'nosotros') ps.points++;
    if (point === 'rival') ps.errors++;
    byPlayer.set(e.playerId, ps);
  }
  return [...byPlayer.values()];
}

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : null);

/** Números clave de cada fundamento (porcentajes de 0 a 100, null si no hubo acciones). */
export function skillSummary(skill: StatSkill, c: SkillCount | undefined) {
  const n = (id: string) => c?.by[id] ?? 0;
  const total = c?.total ?? 0;
  switch (skill) {
    case 'saque':
      return { total, main: n('ace'), errors: n('error'), efficiency: pct(n('ace') - n('error'), total) };
    case 'recepcion':
      return {
        total,
        perfect: pct(n('perfecta'), total),
        positive: pct(n('perfecta') + n('buena'), total),
        errors: n('error'),
      };
    case 'ataque':
      return {
        total,
        main: n('punto'),
        errors: n('error') + n('bloqueado'),
        kill: pct(n('punto'), total),
        efficiency: pct(n('punto') - n('error') - n('bloqueado'), total),
      };
    case 'bloqueo':
      return { total, main: n('punto'), touches: n('toque'), errors: n('error') };
    case 'defensa':
      return { total, main: n('levantada'), errors: n('error'), positive: pct(n('levantada'), total) };
  }
}

export interface RotationStats {
  rotation: number;
  won: number;
  lost: number;
  /** Puntos jugados y ganados recibiendo (side-out) y sacando (break). */
  receiving: number;
  sideOut: number;
  serving: number;
  breaks: number;
}

/** Puntos ganados y perdidos en cada rotación (R1 a R6), del partido o de un set. */
export function rotationStats(state: MatchState, set?: number): RotationStats[] {
  const rows = [1, 6, 5, 4, 3, 2].map((rotation) => ({ rotation, won: 0, lost: 0, receiving: 0, sideOut: 0, serving: 0, breaks: 0 }));
  for (const p of state.points) {
    if (set && p.set !== set) continue;
    const row = rows.find((r) => r.rotation === p.rotation)!;
    const won = p.winner === 'nosotros';
    if (won) row.won++;
    else row.lost++;
    if (p.serving === 'rival') {
      row.receiving++;
      if (won) row.sideOut++;
    } else {
      row.serving++;
      if (won) row.breaks++;
    }
  }
  return rows;
}

export const percent = pct;
