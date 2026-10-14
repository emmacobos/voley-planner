import { sessionDuration, todayISO } from './sessions';
import type { Player, TrainingSession } from './types';

/**
 * Escala de esfuerzo percibido (RPE, Borg CR-10) que responde cada jugadora
 * al terminar: "¿Qué tan duro fue el entrenamiento?".
 */
export const RPE_SCALE: { value: number; label: string }[] = [
  { value: 1, label: 'Muy, muy fácil' },
  { value: 2, label: 'Fácil' },
  { value: 3, label: 'Moderado' },
  { value: 4, label: 'Algo duro' },
  { value: 5, label: 'Duro' },
  { value: 6, label: 'Duro +' },
  { value: 7, label: 'Muy duro' },
  { value: 8, label: 'Muy duro +' },
  { value: 9, label: 'Casi máximo' },
  { value: 10, label: 'Máximo' },
];

/** ¿Ya se tomó asistencia en esta sesión? */
export const hasAttendance = (s: TrainingSession) => Object.keys(s.attendance ?? {}).length > 0;

/**
 * Carga interna de la sesión para una jugadora (sRPE de Foster): RPE × minutos.
 * Se mide en unidades arbitrarias (UA). 0 si no vino o no respondió.
 */
export function playerSessionLoad(session: TrainingSession, playerId: string): number {
  const record = session.attendance?.[playerId];
  if (!record?.present || !record.rpe) return 0;
  return record.rpe * sessionDuration(session);
}

export interface SessionAttendanceSummary {
  called: number;
  present: number;
  /** RPE promedio de las que respondieron, o null. */
  avgRpe: number | null;
  /** Carga promedio de las presentes que respondieron (UA), o null. */
  avgLoad: number | null;
}

export function sessionAttendanceSummary(session: TrainingSession): SessionAttendanceSummary {
  const records = session.playerIds.map((id) => session.attendance?.[id]).filter((r) => r !== undefined);
  const present = records.filter((r) => r.present);
  const rated = present.filter((r) => r.rpe);
  const avgRpe = rated.length ? rated.reduce((sum, r) => sum + r.rpe!, 0) / rated.length : null;
  return {
    called: session.playerIds.length,
    present: present.length,
    avgRpe,
    avgLoad: avgRpe === null ? null : Math.round(avgRpe * sessionDuration(session)),
  };
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Lunes de la semana de `date`. */
export function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export interface PlayerLoadReport {
  player: Player;
  /** Sesiones con asistencia tomada a las que estaba convocada (últimos 28 días). */
  called: number;
  attended: number;
  /** Asistencia en %, o null si no hay sesiones con asistencia. */
  attendanceRate: number | null;
  /** Carga de esta semana (lunes a domingo). */
  weekLoad: number;
  /** Promedio de carga de las 3 semanas anteriores (las que tienen registro). */
  prevAvgLoad: number;
  alerts: string[];
}

/** Umbral de aumento brusco: más de 30 % sobre el promedio de las 3 semanas anteriores. */
const SPIKE = 1.3;
const LOW_ATTENDANCE = 70;

/**
 * Asistencia de las últimas 4 semanas y carga semanal de cada jugadora, con
 * avisos de carga que se dispara, faltas seguidas o asistencia baja.
 */
export function playerLoadReports(
  players: Player[],
  sessions: TrainingSession[],
  today: Date = new Date(),
): PlayerLoadReport[] {
  const todayStr = todayISO(today);
  const since = todayISO(addDays(today, -27));
  const monday = mondayOf(today);
  const weekStart = todayISO(monday);
  const weekEnd = todayISO(addDays(monday, 6));
  const taken = sessions
    .filter((s) => hasAttendance(s) && s.date <= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return players.map((player) => {
    // Solo las sesiones en las que se registró a esta jugadora.
    const mine = taken.filter((s) => s.playerIds.includes(player.id) && s.attendance?.[player.id] !== undefined);
    const recent = mine.filter((s) => s.date >= since);
    const attended = recent.filter((s) => s.attendance?.[player.id]?.present).length;
    const attendanceRate = recent.length ? Math.round((attended / recent.length) * 100) : null;

    const loadBetween = (start: string, end: string) =>
      mine.filter((s) => s.date >= start && s.date <= end).reduce((sum, s) => sum + playerSessionLoad(s, player.id), 0);
    const weekLoad = loadBetween(weekStart, weekEnd);
    // Promedio de las 3 semanas anteriores, contando solo las semanas en las que se la registró.
    const prevWeeks = [1, 2, 3]
      .map((w) => {
        const start = todayISO(addDays(monday, -7 * w));
        const end = todayISO(addDays(monday, -7 * w + 6));
        const recorded = mine.some((s) => s.date >= start && s.date <= end);
        return recorded ? loadBetween(start, end) : null;
      })
      .filter((load) => load !== null);
    const prevAvgLoad = prevWeeks.length ? Math.round(prevWeeks.reduce((a, b) => a + b, 0) / prevWeeks.length) : 0;

    const alerts: string[] = [];
    // Con menos de 2 semanas de referencia no hay con qué comparar.
    if (prevWeeks.length >= 2 && prevAvgLoad > 0 && weekLoad > prevAvgLoad * SPIKE) {
      alerts.push(`La carga de esta semana subió ${Math.round((weekLoad / prevAvgLoad - 1) * 100)} % sobre su promedio.`);
    }
    const lastTwo = mine.slice(-2);
    if (lastTwo.length === 2 && lastTwo.every((s) => s.attendance?.[player.id]?.present === false)) {
      alerts.push('Faltó a las últimas 2 sesiones.');
    } else if (attendanceRate !== null && recent.length >= 3 && attendanceRate < LOW_ATTENDANCE) {
      alerts.push(`Asistencia baja: ${attendanceRate} % en las últimas 4 semanas.`);
    }

    return { player, called: recent.length, attended, attendanceRate, weekLoad, prevAvgLoad, alerts };
  });
}
