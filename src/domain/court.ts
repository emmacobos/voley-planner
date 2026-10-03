import type { Team, Zone } from './types';

/**
 * Coordenadas en metros. La cancha va de (0,0) a (18,9); la red está en x = 9.
 * El equipo A juega en la mitad izquierda (mira hacia +x) y el B en la derecha.
 * El eje y crece hacia abajo (como en SVG).
 */
export const COURT_LENGTH = 18;
export const COURT_WIDTH = 9;
export const NET_X = 9;
export const ATTACK_LINE_DIST = 3;
export const FREE_ZONE = 3;

export const VIEW = {
  minX: -FREE_ZONE,
  minY: -FREE_ZONE,
  width: COURT_LENGTH + FREE_ZONE * 2,
  height: COURT_WIDTH + FREE_ZONE * 2,
};

/** Distancia a la red desde el punto de vista del equipo. */
export function distanceToNet(team: Team, x: number): number {
  return team === 'A' ? NET_X - x : x - NET_X;
}

/**
 * Distancia lateral medida desde la línea lateral izquierda del equipo
 * (mirando hacia la red). A mira hacia +x, así que su izquierda es y = 0;
 * B mira hacia -x, así que su izquierda es y = 9.
 */
export function lateralFromLeft(team: Team, y: number): number {
  return team === 'A' ? y : COURT_WIDTH - y;
}

/** Convierte coordenadas relativas al equipo a coordenadas de la cancha. */
export function toCourt(
  team: Team,
  depth: number,
  lateral: number,
): { x: number; y: number } {
  return team === 'A'
    ? { x: NET_X - depth, y: lateral }
    : { x: NET_X + depth, y: COURT_WIDTH - lateral };
}

const FRONT_DEPTH = 1.5;
const BACK_DEPTH = 6;
const LEFT = 1.5;
const MIDDLE = 4.5;
const RIGHT = 7.5;

/** Posición base de cada zona (relativa al equipo). */
export const ZONE_BASE: Record<Zone, { depth: number; lateral: number }> = {
  1: { depth: BACK_DEPTH, lateral: RIGHT },
  2: { depth: FRONT_DEPTH, lateral: RIGHT },
  3: { depth: FRONT_DEPTH, lateral: MIDDLE },
  4: { depth: FRONT_DEPTH, lateral: LEFT },
  5: { depth: BACK_DEPTH, lateral: LEFT },
  6: { depth: BACK_DEPTH, lateral: MIDDLE },
};

export function zoneBasePosition(team: Team, zone: Zone) {
  const { depth, lateral } = ZONE_BASE[zone];
  return toCourt(team, depth, lateral);
}

export function clampToView(x: number, y: number) {
  return {
    x: Math.min(VIEW.minX + VIEW.width, Math.max(VIEW.minX, x)),
    y: Math.min(VIEW.minY + VIEW.height, Math.max(VIEW.minY, y)),
  };
}
