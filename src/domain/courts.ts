import type { CourtInfo, Exercise, Frame, TeamNames } from './types';

/**
 * Ejercicios con varias canchas (estaciones). La cancha principal es la de
 * `exercise.frames` (así los ejercicios de siempre no cambian); las demás
 * están en `extraCourts`, cada una con su propia jugada.
 */
export const MAIN_COURT = 'principal';
export const MAX_COURTS = 3;

export interface Court extends CourtInfo {
  id: string;
  frames: Frame[];
  teamNames?: TeamNames;
}

type CourtSource = Pick<Exercise, 'frames' | 'teamNames' | 'mainCourt' | 'extraCourts'>;

/** Todas las canchas del ejercicio, empezando por la principal. */
export function exerciseCourts(ex: CourtSource): Court[] {
  return [{ ...ex.mainCourt, id: MAIN_COURT, frames: ex.frames, teamNames: ex.teamNames }, ...(ex.extraCourts ?? [])];
}

/** Nombre para mostrar de una cancha (por su posición si no tiene nombre). */
export function courtLabel(court: Pick<Court, 'name'>, index: number): string {
  return court.name?.trim() || `Cancha ${index + 1}`;
}

/** Cambios para guardar en el ejercicio al modificar una cancha. */
export function updateCourt(ex: CourtSource, id: string, patch: Partial<Omit<Court, 'id'>>): Partial<Exercise> {
  if (id === MAIN_COURT) {
    const { frames, teamNames, ...info } = patch;
    return {
      ...(frames ? { frames } : {}),
      ...('teamNames' in patch ? { teamNames } : {}),
      ...(Object.keys(info).length ? { mainCourt: { ...ex.mainCourt, ...info } } : {}),
    };
  }
  return { extraCourts: (ex.extraCourts ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

/** Cantidad de pasos de la vista "todas juntas": la de la cancha con más pasos. */
export function sharedStepCount(courts: Court[]): number {
  return Math.max(1, ...courts.map((c) => c.frames.length));
}

/** Elementos de una cancha en un momento de la reproducción conjunta (las que tienen menos pasos quedan en el último). */
export function courtProgress(court: Court, progress: number): number {
  return Math.min(progress, court.frames.length - 1);
}
