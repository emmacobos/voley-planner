import type { Player, Position, Team, Zone } from './types';

/** Roles del sistema 5-1, en el orden en que se suceden en la rotación. */
export const ROLE_ORDER = ['S', 'OH1', 'MB2', 'OPP', 'OH2', 'MB1'] as const;
export type RoleKey = (typeof ROLE_ORDER)[number];

/** Roles en cancha, incluyendo al líbero. */
export type LineupRole = RoleKey | 'L';

export type Lineup = Partial<Record<LineupRole, Player>>;

export const ROLE_POSITION: Record<LineupRole, Position> = {
  S: 'armador',
  OH1: 'punta',
  MB2: 'central',
  OPP: 'opuesto',
  OH2: 'punta',
  MB1: 'central',
  L: 'libero',
};

/** Etiqueta de la ficha cuando no hay un jugador del plantel asignado. */
export const ROLE_LABEL: Record<LineupRole, string> = {
  S: 'A',
  OH1: 'P1',
  MB2: 'C2',
  OPP: 'O',
  OH2: 'P2',
  MB1: 'C1',
  L: 'L',
};

/**
 * Zona de cada rol para una rotación del 5-1. La rotación se nombra por la
 * zona donde está el armador (rotación 1 = armador en zona 1).
 */
export function zonesForRotation(rotation: Zone): Record<RoleKey, Zone> {
  const result = {} as Record<RoleKey, Zone>;
  ROLE_ORDER.forEach((role, i) => {
    result[role] = (((rotation - 1 + i) % 6) + 1) as Zone;
  });
  return result;
}

export function isFrontRow(zone: Zone): boolean {
  return zone === 2 || zone === 3 || zone === 4;
}

/**
 * Asigna jugadores del plantel a los roles del 5-1 según su posición.
 * Los roles sin jugador disponible quedan sin asignar.
 */
export function assignLineup(players: Player[]): Lineup {
  const pool = [...players].sort((a, b) => a.number - b.number);
  const take = (pos: Position) => {
    const i = pool.findIndex((p) => p.position === pos);
    return i === -1 ? undefined : pool.splice(i, 1)[0];
  };
  const lineup: Lineup = {};
  lineup.S = take('armador');
  lineup.OPP = take('opuesto');
  lineup.OH1 = take('punta');
  lineup.OH2 = take('punta');
  lineup.MB1 = take('central');
  lineup.MB2 = take('central');
  lineup.L = take('libero');
  return lineup;
}

/** Id estable por equipo y rol, para que la animación entre formaciones funcione. */
export function roleTokenId(team: Team, role: LineupRole): string {
  return `${team}-${role}`;
}
