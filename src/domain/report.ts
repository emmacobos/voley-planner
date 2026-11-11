import { LIBRARY } from './library';
import type { LibraryExercise } from './library';
import { exerciseContents } from './season';
import { eventPoint, highlights, percent, playerStats, replay, rotationStats, setFinished, skillSummary } from './stats';
import type { PlayerStats, Side } from './stats';
import type { BestOf, Content, Exercise, Match, MatchStats, Player, StatSkill } from './types';

/**
 * Informe del partido: de dónde salieron los puntos, los momentos de cada set
 * (rachas y cierres), una ficha por jugadora, qué conviene trabajar y cómo
 * fue comparado con los partidos anteriores. Todo sale de lo anotado en vivo.
 */

// ---------------------------------------------------------------------------
// De dónde salieron los puntos

export interface PointSources {
  ours: { ataque: number; saque: number; bloqueo: number; rivalError: number; total: number };
  theirs: {
    /** Puntos del rival anotados con "Punto del rival" o con una defensa que no llegó. */
    rival: number;
    /** Nos bloquearon un ataque. */
    blocked: number;
    /** Recepciones con error: aces del rival. */
    aces: number;
    serveErrors: number;
    attackErrors: number;
    blockErrors: number;
    /** Errores nuestros que regalaron el punto (saque, ataque y bloqueo). */
    ownErrors: number;
    total: number;
  };
}

export function pointSources(stats: MatchStats | undefined, set?: number): PointSources {
  const ours = { ataque: 0, saque: 0, bloqueo: 0, rivalError: 0, total: 0 };
  const theirs = { rival: 0, blocked: 0, aces: 0, serveErrors: 0, attackErrors: 0, blockErrors: 0, ownErrors: 0, total: 0 };
  let currentSet = 0;
  for (const e of stats?.events ?? []) {
    if (e.type === 'set') currentSet++;
    if (set && currentSet !== set) continue;
    const winner = eventPoint(e);
    if (!winner) continue;
    if (winner === 'nosotros') {
      ours.total++;
      if (e.type === 'rival') ours.rivalError++;
      else if (e.type === 'accion' && (e.skill === 'ataque' || e.skill === 'saque' || e.skill === 'bloqueo')) ours[e.skill]++;
      continue;
    }
    theirs.total++;
    if (e.type === 'rival') theirs.rival++;
    else if (e.type === 'accion') {
      if (e.skill === 'saque') theirs.serveErrors++;
      else if (e.skill === 'recepcion') theirs.aces++;
      else if (e.skill === 'ataque') {
        if (e.result === 'bloqueado') theirs.blocked++;
        else theirs.attackErrors++;
      } else if (e.skill === 'bloqueo') theirs.blockErrors++;
      else theirs.rival++;
    }
  }
  theirs.ownErrors = theirs.serveErrors + theirs.attackErrors + theirs.blockErrors;
  return { ours, theirs };
}

// ---------------------------------------------------------------------------
// Momentos de cada set: rachas y cierres

export interface Run {
  length: number;
  /** Marcador antes y después de la racha (nosotros-rival). */
  from: string;
  to: string;
  /** Nuestra rotación cuando empezó. */
  rotation: number;
}

export interface SetMoments {
  number: number;
  us: number;
  them: number;
  finished: boolean;
  bestRun: Run | null;
  worstRun: Run | null;
  /** Puntos jugados y ganados desde los 20 (o desde los 10 en el set a 15). */
  closing: { from: number; won: number; played: number };
}

export function setMoments(stats: MatchStats | undefined, bestOf: BestOf = 5): SetMoments[] {
  const state = replay(stats);
  return state.sets.map((set) => {
    const points = state.points.filter((p) => p.set === set.number);
    const closeFrom = set.number === bestOf ? 10 : 20;
    let us = 0;
    let them = 0;
    let best: Run | null = null;
    let worst: Run | null = null;
    let run: { winner: Side; length: number; from: string; rotation: number } | null = null;
    const closing = { from: closeFrom, won: 0, played: 0 };
    const close = () => {
      if (!run) return;
      const r: Run = { length: run.length, from: run.from, to: `${us}-${them}`, rotation: run.rotation };
      if (run.winner === 'nosotros' && (!best || r.length > best.length)) best = r;
      if (run.winner === 'rival' && (!worst || r.length > worst.length)) worst = r;
    };
    for (const p of points) {
      if (Math.max(us, them) >= closeFrom) {
        closing.played++;
        if (p.winner === 'nosotros') closing.won++;
      }
      if (!run || run.winner !== p.winner) {
        close();
        run = { winner: p.winner, length: 0, from: `${us}-${them}`, rotation: p.rotation };
      }
      run.length++;
      if (p.winner === 'nosotros') us++;
      else them++;
    }
    close();
    return { number: set.number, us: set.us, them: set.them, finished: setFinished(set, bestOf), bestRun: best, worstRun: worst, closing };
  });
}

// ---------------------------------------------------------------------------
// Ficha de cada jugadora

/** Cada acción con el set y la rotación en que pasó. */
function actionsWithContext(stats: MatchStats | undefined) {
  const state = replay(stats);
  const out: { playerId: string | null; skill: StatSkill; result: string; set: number; rotation: number; point: Side | null }[] = [];
  let set = 0;
  (stats?.events ?? []).forEach((e, i) => {
    if (e.type === 'set') set++;
    if (e.type === 'accion') out.push({ playerId: e.playerId, skill: e.skill, result: e.result, set, rotation: state.rotations[i] ?? 1, point: eventPoint(e) });
  });
  return out;
}

/** Porcentaje de "bien" de cada fundamento (lo que se muestra en la barrita de la ficha). */
const GOOD: Record<StatSkill, { label: string; good: string[] }> = {
  ataque: { label: 'a punto', good: ['punto'] },
  recepcion: { label: 'positiva', good: ['perfecta', 'buena'] },
  saque: { label: 'sin error', good: ['ace', 'complica', 'en-juego'] },
  bloqueo: { label: 'a punto', good: ['punto'] },
  defensa: { label: 'levantada', good: ['levantada'] },
};

const SKILL_LABEL: Record<StatSkill, string> = {
  saque: 'Saque',
  recepcion: 'Recepción',
  ataque: 'Ataque',
  bloqueo: 'Bloqueo',
  defensa: 'Defensa',
};

export interface PlayerMetric {
  skill: StatSkill;
  label: string;
  /** Qué mide el porcentaje (a punto, positiva…). */
  measure: string;
  value: number;
  /** Promedio del equipo en lo mismo. */
  team: number | null;
  good: number;
  total: number;
}

export interface PlayerCard {
  playerId: string;
  points: number;
  errors: number;
  balance: number;
  metrics: PlayerMetric[];
  strengths: string[];
  weaknesses: string[];
}

const goodCount = (by: Record<string, number> | undefined, skill: StatSkill) =>
  GOOD[skill].good.reduce((a, id) => a + (by?.[id] ?? 0), 0);

/** Totales del equipo por fundamento (todas las jugadoras juntas). */
function teamCounts(rows: PlayerStats[]) {
  const team: Partial<Record<StatSkill, { total: number; by: Record<string, number> }>> = {};
  for (const r of rows)
    for (const [skill, c] of Object.entries(r.skills) as [StatSkill, { total: number; by: Record<string, number> }][]) {
      const t = (team[skill] ??= { total: 0, by: {} });
      t.total += c.total;
      for (const [k, v] of Object.entries(c.by)) t.by[k] = (t.by[k] ?? 0) + v;
    }
  return team;
}

export function playerCards(stats: MatchStats | undefined, players: Player[]): PlayerCard[] {
  const rows = playerStats(stats).filter((r): r is PlayerStats & { playerId: string } => !!r.playerId);
  const team = teamCounts(rows);
  const actions = actionsWithContext(stats);
  const teamPct = (skill: StatSkill) => percent(goodCount(team[skill]?.by, skill), team[skill]?.total ?? 0);
  const teamAttackEff = (skillSummary('ataque', team.ataque) as { efficiency: number | null }).efficiency;
  const topPoints = Math.max(0, ...rows.map((r) => r.points));
  const number = (id: string) => players.find((p) => p.id === id)?.number ?? 999;

  return rows
    .sort((a, b) => number(a.playerId) - number(b.playerId))
    .map((r) => {
      const mine = actions.filter((a) => a.playerId === r.playerId);
      const metrics = (Object.keys(r.skills) as StatSkill[])
        .map((skill) => {
          const c = r.skills[skill]!;
          const good = goodCount(c.by, skill);
          return { skill, label: SKILL_LABEL[skill], measure: GOOD[skill].label, value: percent(good, c.total) ?? 0, team: teamPct(skill), good, total: c.total };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

      // Lo bueno y lo que hay que trabajar, con un puntaje para quedarse con lo más claro.
      const strengths: [number, string][] = [];
      const weaknesses: [number, string][] = [];
      const n = (skill: StatSkill, id: string) => r.skills[skill]?.by[id] ?? 0;
      const total = (skill: StatSkill) => r.skills[skill]?.total ?? 0;
      const pctOf = (skill: StatSkill) => percent(goodCount(r.skills[skill]?.by, skill), total(skill)) ?? 0;

      if (r.points >= 5 && r.points === topPoints) strengths.push([10, `Máxima anotadora del equipo (${r.points} puntos)`]);
      if (total('ataque') >= 8) {
        const kill = pctOf('ataque');
        const teamKill = teamPct('ataque') ?? 0;
        const eff = (skillSummary('ataque', r.skills.ataque) as { efficiency: number | null }).efficiency ?? 0;
        if (kill >= teamKill + 5) strengths.push([6 + (kill - teamKill) / 5, `Ataque: ${kill} % a punto (el equipo ${teamKill} %)`]);
        if (teamAttackEff !== null && eff <= teamAttackEff - 10)
          weaknesses.push([6 + (teamAttackEff - eff) / 5, `Ataque: eficacia ${eff} % (el equipo ${teamAttackEff} %)`]);
      }
      const attackErrors = n('ataque', 'error') + n('ataque', 'bloqueado');
      if (attackErrors >= 4) weaknesses.push([attackErrors, `${attackErrors} ataques afuera, a la red o bloqueados`]);
      if (total('recepcion') >= 6) {
        const pos = pctOf('recepcion');
        const teamPos = teamPct('recepcion') ?? 0;
        if (pos >= teamPos + 5) strengths.push([6 + (pos - teamPos) / 5, `Recepción: ${pos} % positiva (el equipo ${teamPos} %)`]);
        if (pos <= teamPos - 10) weaknesses.push([6 + (teamPos - pos) / 5, `Recepción: ${pos} % positiva (el equipo ${teamPos} %)`]);
      }
      const recErrors = mine.filter((a) => a.skill === 'recepcion' && a.result === 'error');
      if (recErrors.length >= 2) {
        const rots = new Set(recErrors.map((a) => a.rotation));
        const where = rots.size === 1 ? `: ${recErrors.length === 2 ? 'las dos' : 'todas'} en R${recErrors[0].rotation}` : '';
        weaknesses.push([recErrors.length + 2, `${recErrors.length} recepciones con error (aces del rival)${where}`]);
      }
      if (n('saque', 'ace') >= 2) strengths.push([4 + n('saque', 'ace'), `${n('saque', 'ace')} aces`]);
      if (total('saque') >= 8 && n('saque', 'error') === 0) strengths.push([5, `Saque seguro: ${total('saque')} saques sin errores`]);
      if (n('saque', 'error') >= 3 && n('saque', 'error') / total('saque') >= 0.2)
        weaknesses.push([4 + n('saque', 'error'), `Saque: ${n('saque', 'error')} errores en ${total('saque')} saques`]);
      if (n('bloqueo', 'punto') >= 3) strengths.push([4 + n('bloqueo', 'punto'), `${n('bloqueo', 'punto')} puntos de bloqueo`]);
      if (n('bloqueo', 'error') >= 3) weaknesses.push([3 + n('bloqueo', 'error'), `${n('bloqueo', 'error')} errores de bloqueo (red o invasión)`]);
      if (n('defensa', 'levantada') >= 10) strengths.push([4 + n('defensa', 'levantada') / 5, `${n('defensa', 'levantada')} defensas levantadas`]);
      // Errores juntos en un mismo set.
      const errorSets = mine.filter((a) => a.point === 'rival').map((a) => a.set);
      if (errorSets.length >= 3) {
        const bySet = new Map<number, number>();
        errorSets.forEach((s) => bySet.set(s, (bySet.get(s) ?? 0) + 1));
        const [set, count] = [...bySet.entries()].sort((a, b) => b[1] - a[1])[0];
        if (count / errorSets.length >= 0.75)
          weaknesses.push([5, `${count} de sus ${errorSets.length} errores fueron en el set ${set}`]);
      }

      const top = (list: [number, string][]) =>
        list
          .sort((a, b) => b[0] - a[0])
          .slice(0, 2)
          .map(([, text]) => text);
      return {
        playerId: r.playerId,
        points: r.points,
        errors: r.errors,
        balance: r.points - r.errors,
        metrics,
        strengths: top(strengths),
        weaknesses: top(weaknesses),
      };
    });
}

// ---------------------------------------------------------------------------
// Para trabajar en los entrenamientos

export interface WorkItem {
  id: string;
  title: string;
  why: string;
  /** Contenido que se entrena (para sugerir un ejercicio). */
  content: Content;
  /** Palabras para preferir un ejercicio entre los del mismo contenido. */
  prefer: string[];
  severity: number;
}

export function workItems(stats: MatchStats | undefined, players: Player[], bestOf: BestOf = 5): WorkItem[] {
  const state = replay(stats);
  const rows = playerStats(stats);
  const rotations = rotationStats(state);
  const h = highlights(rows, rotations);
  const team = teamCounts(rows);
  const moments = setMoments(stats, bestOf);
  const sources = pointSources(stats);
  const items: WorkItem[] = [];
  const name = (id: string | null) => players.find((p) => p.id === id)?.name.split(' ')[0];

  const weak = h.weakest;
  const weakSO = weak ? percent(weak.sideOut, weak.receiving)! : null;
  if (weak && weakSO !== null && weak.receiving >= 4 && weakSO < 50) {
    const run = moments
      .filter((m) => m.worstRun && m.worstRun.rotation === weak.rotation && m.worstRun.length >= 4)
      .sort((a, b) => b.worstRun!.length - a.worstRun!.length)[0];
    items.push({
      id: 'rotacion',
      title: `Recepción y side-out en R${weak.rotation}`,
      why:
        `Side-out ${weakSO} % (${weak.sideOut} de ${weak.receiving}), el más bajo del partido.` +
        (run ? ` Ahí vino la racha de ${run.worstRun!.length} puntos en contra del set ${run.number}.` : ''),
      content: 'recepcion',
      prefer: ['rotacion', 'k1'],
      severity: 8 + (50 - weakSO) / 5,
    });
  }

  const rec = team.recepcion;
  if (rec && rec.total >= 10) {
    const pos = percent((rec.by.perfecta ?? 0) + (rec.by.buena ?? 0), rec.total)!;
    if (pos < 55)
      items.push({
        id: 'recepcion',
        title: 'Recepción',
        why: `${pos} % positiva (${(rec.by.perfecta ?? 0) + (rec.by.buena ?? 0)} de ${rec.total}) y ${rec.by.error ?? 0} aces en contra.`,
        content: 'recepcion',
        prefer: ['recepcion'],
        severity: 6 + (55 - pos) / 5,
      });
  }

  const att = team.ataque;
  if (att && att.total >= 10) {
    const errors = (att.by.error ?? 0) + (att.by.bloqueado ?? 0);
    const ratio = errors / att.total;
    const eff = (skillSummary('ataque', att) as { efficiency: number | null }).efficiency ?? 0;
    if (ratio >= 0.15 || eff < 20) {
      const culprits = rows
        .filter((r) => r.playerId)
        .map((r) => ({ id: r.playerId, e: (r.skills.ataque?.by.error ?? 0) + (r.skills.ataque?.by.bloqueado ?? 0) }))
        .filter((x) => x.e > 0)
        .sort((a, b) => b.e - a.e)
        .slice(0, 2);
      const who = culprits.length ? ` Más que nada ${culprits.map((c) => `${name(c.id)} (${c.e})`).join(' y ')}.` : '';
      items.push({
        id: 'ataque',
        title: ratio >= 0.15 ? 'Errores de ataque' : 'Eficacia de ataque',
        why: `${errors} ataques afuera, a la red o bloqueados de ${att.total} (${Math.round(ratio * 100)} %); eficacia ${eff} %.${who}`,
        content: 'ataque',
        prefer: ['ataque'],
        severity: 5 + ratio * 20 + Math.max(0, 20 - eff) / 5,
      });
    }
  }

  const srv = team.saque;
  if (srv && srv.total >= 10) {
    const errors = srv.by.error ?? 0;
    const ratio = errors / srv.total;
    if (ratio >= 0.12)
      items.push({
        id: 'saque',
        title: 'Errores de saque',
        why: `${errors} saques errados de ${srv.total} (${Math.round(ratio * 100)} %): ${errors} puntos regalados.`,
        content: 'saque',
        prefer: ['saque'],
        severity: 4 + ratio * 25,
      });
  }

  const closing = moments.reduce((a, m) => ({ won: a.won + m.closing.won, played: a.played + m.closing.played }), { won: 0, played: 0 });
  if (closing.played >= 6 && closing.won / closing.played < 0.5) {
    const worstSet = moments.filter((m) => m.closing.played >= 3).sort((a, b) => a.closing.won / a.closing.played - b.closing.won / b.closing.played)[0];
    items.push({
      id: 'cierre',
      title: 'Cierre de set',
      why:
        `En el final de los sets ganamos ${closing.won} de ${closing.played} puntos (${percent(closing.won, closing.played)} %).` +
        (worstSet ? ` En el set ${worstSet.number}, ${worstSet.closing.won} de ${worstSet.closing.played}.` : ''),
      content: 'juego',
      prefer: ['doble punto', 'wash', 'reducido', 'juego'],
      severity: 5 + (0.5 - closing.won / closing.played) * 10,
    });
  }

  const brk = percent(h.breaks.won, h.breaks.of);
  if (brk !== null && h.breaks.of >= 15 && brk < 40)
    items.push({
      id: 'break',
      title: 'Ganar puntos con nuestro saque (break)',
      why: `Break ${brk} % (${h.breaks.won} de ${h.breaks.of}): cuando sacamos nos cuesta cerrar el punto con bloqueo, defensa y contraataque.`,
      content: 'contraataque',
      prefer: ['contraataque', 'transicion', 'k2'],
      severity: 4 + (40 - brk) / 5,
    });

  const longest = moments.filter((m) => m.worstRun).sort((a, b) => b.worstRun!.length - a.worstRun!.length)[0];
  if (longest && longest.worstRun!.length >= 5 && !items.some((i) => i.id === 'rotacion' && i.why.includes(`set ${longest.number}`)))
    items.push({
      id: 'rachas',
      title: 'Cortar las rachas en contra',
      why: `Racha de ${longest.worstRun!.length} puntos seguidos en contra en el set ${longest.number} (de ${longest.worstRun!.from} a ${longest.worstRun!.to}), en R${longest.worstRun!.rotation}.`,
      content: 'juego',
      prefer: ['rey', 'reducido', 'juego'],
      severity: 3 + longest.worstRun!.length / 2,
    });

  if (sources.theirs.blockErrors >= 4)
    items.push({
      id: 'bloqueo',
      title: 'Errores de bloqueo',
      why: `${sources.theirs.blockErrors} puntos regalados con toques de red o invasión.`,
      content: 'bloqueo',
      prefer: ['bloqueo'],
      severity: 3 + sources.theirs.blockErrors / 2,
    });

  return items.sort((a, b) => b.severity - a.severity).slice(0, 4);
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export type Suggestion = { kind: 'propio'; exercise: Exercise } | { kind: 'biblioteca'; exercise: LibraryExercise };

/**
 * Un ejercicio para trabajar algo: el que mejor coincide (por las palabras
 * preferidas y por ser más específico), entre los propios y los de la
 * biblioteca; a igual coincidencia, gana el propio.
 */
export function suggestExercise(item: Pick<WorkItem, 'content' | 'prefer'>, exercises: Exercise[]): Suggestion | null {
  const score = (ex: { name: string; objective: string; contents?: Content[] }, own: boolean) => {
    const contents = exerciseContents(ex);
    if (!contents.includes(item.content)) return Infinity;
    const text = normalize(`${ex.name} ${ex.objective}`);
    const i = item.prefer.findIndex((p) => text.includes(normalize(p)));
    return (i === -1 ? item.prefer.length : i) * 10 + contents.length + (own ? 0 : 0.5);
  };
  const candidates: { s: number; suggestion: Suggestion }[] = [
    ...exercises.map((exercise) => ({ s: score(exercise, true), suggestion: { kind: 'propio' as const, exercise } })),
    ...LIBRARY.map((exercise) => ({ s: score(exercise, false), suggestion: { kind: 'biblioteca' as const, exercise } })),
  ].filter((c) => c.s !== Infinity);
  candidates.sort((a, b) => a.s - b.s);
  return candidates[0]?.suggestion ?? null;
}

// ---------------------------------------------------------------------------
// Comparado con los partidos anteriores

export interface Kpis {
  sideOut: number | null;
  reception: number | null;
  attack: number | null;
  /** Errores nuestros que regalaron el punto. */
  ownErrors: number;
}

export function matchKpis(stats: MatchStats | undefined): Kpis {
  const state = replay(stats);
  const rows = playerStats(stats);
  const h = highlights(rows, rotationStats(state));
  const team = teamCounts(rows);
  const rec = team.recepcion;
  return {
    sideOut: percent(h.sideOut.won, h.sideOut.of),
    reception: rec ? percent((rec.by.perfecta ?? 0) + (rec.by.buena ?? 0), rec.total) : null,
    attack: team.ataque ? (skillSummary('ataque', team.ataque) as { efficiency: number | null }).efficiency : null,
    ownErrors: pointSources(stats).theirs.ownErrors,
  };
}

const hasPoints = (m: Match) => !!m.stats?.events.some((e) => e.type === 'accion' || e.type === 'rival');

/** Hasta 5 partidos anteriores del mismo plantel con estadísticas, del más nuevo al más viejo. */
export function previousWithStats(matches: Match[], match: Match, limit = 5): Match[] {
  const key = (m: Match) => `${m.date} ${m.time}`;
  return matches
    .filter((m) => m.id !== match.id && m.squadId === match.squadId && key(m) < key(match) && hasPoints(m))
    .sort((a, b) => key(b).localeCompare(key(a)))
    .slice(0, limit);
}

export interface Trend {
  id: keyof Kpis;
  label: string;
  value: number | null;
  average: number | null;
  /** true: más es mejor (side-out); false: menos es mejor (errores). */
  higherIsBetter: boolean;
  suffix: string;
}

export function trends(match: Match, previous: Match[]): Trend[] {
  const now = matchKpis(match.stats);
  const past = previous.map((m) => matchKpis(m.stats));
  const avg = (k: keyof Kpis) => {
    const values = past.map((p) => p[k]).filter((v): v is number => v !== null);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  };
  return [
    { id: 'sideOut', label: 'Side-out', value: now.sideOut, average: avg('sideOut'), higherIsBetter: true, suffix: ' %' },
    { id: 'reception', label: 'Recepción positiva', value: now.reception, average: avg('reception'), higherIsBetter: true, suffix: ' %' },
    { id: 'attack', label: 'Eficacia de ataque', value: now.attack, average: avg('attack'), higherIsBetter: true, suffix: ' %' },
    { id: 'ownErrors', label: 'Errores regalados', value: now.ownErrors, average: avg('ownErrors'), higherIsBetter: false, suffix: '' },
  ];
}
