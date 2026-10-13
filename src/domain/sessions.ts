import type {
  BlockKind,
  Exercise,
  ExerciseType,
  Intensity,
  SessionBlock,
  TrainingSession,
} from './types';
import { newId } from './ids';

type ExerciseLookup = Map<string, Exercise>;

/** Duración de un bloque: la suma de sus ejercicios o, si no tiene, su duración propia. */
export function blockDuration(block: SessionBlock): number {
  return block.items.length
    ? block.items.reduce((sum, item) => sum + item.durationMin, 0)
    : block.durationMin;
}

export function sessionDuration(session: TrainingSession): number {
  return session.blocks.reduce((sum, b) => sum + blockDuration(b), 0);
}

const INTENSITY_VALUE: Record<Intensity, number> = { baja: 1, media: 2, alta: 3 };

/**
 * Intensidad promedio de la sesión ponderada por minutos, contando solo los
 * ejercicios de la biblioteca. Devuelve null si no hay ejercicios.
 */
export function sessionIntensity(session: TrainingSession, exercises: ExerciseLookup): Intensity | null {
  let minutes = 0;
  let weighted = 0;
  for (const block of session.blocks) {
    for (const item of block.items) {
      const ex = exercises.get(item.exerciseId);
      if (!ex || item.durationMin <= 0) continue;
      minutes += item.durationMin;
      weighted += item.durationMin * INTENSITY_VALUE[ex.intensity];
    }
  }
  if (minutes === 0) return null;
  const avg = weighted / minutes;
  return avg < 1.67 ? 'baja' : avg < 2.34 ? 'media' : 'alta';
}

/** Minutos de la sesión por tipo de ejercicio. */
export function minutesByType(
  session: TrainingSession,
  exercises: ExerciseLookup,
): Record<ExerciseType, number> {
  const result: Record<ExerciseType, number> = { analitico: 0, sintetico: 0, global: 0 };
  for (const block of session.blocks) {
    for (const item of block.items) {
      const ex = exercises.get(item.exerciseId);
      if (ex) result[ex.type] += item.durationMin;
    }
  }
  return result;
}

export function newBlock(kind: BlockKind, title: string, durationMin: number, playerIds: string[] = []): SessionBlock {
  return { id: newId(), kind, title, durationMin, items: [], playerIds, notes: '' };
}

/** Bloques con los que arranca una sesión nueva (90 minutos). */
export function defaultBlocks(): SessionBlock[] {
  return [
    newBlock('calentamiento', 'Calentamiento', 15),
    newBlock('tecnica', 'Técnica', 20),
    newBlock('tactica', 'Táctica', 25),
    newBlock('juego', 'Juego', 20),
    newBlock('vuelta-calma', 'Vuelta a la calma', 10),
  ];
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Miércoles, 14 de octubre de 2026" */
export function formatDate(date: string): string {
  if (!date) return 'Sin fecha';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const text = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function todayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
