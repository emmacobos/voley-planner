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
export function roleTokenId(team: Team, role: SystemRole): string {
  return `${team}-${role}`;
}

/** Roles del 4-2: dos armadores enfrentados (arma el que está adelante). */
export const ROLE_ORDER_42 = ['S1', 'OH1', 'MB2', 'S2', 'OH2', 'MB1'] as const;
export type RoleKey42 = (typeof ROLE_ORDER_42)[number];

/** Roles del 6-0: seis jugadores universales (arma el que pasa por la zona elegida). */
export const ROLE_ORDER_60 = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'] as const;
export type RoleKey60 = (typeof ROLE_ORDER_60)[number];

/** Cualquier rol de cualquier sistema (incluye al líbero). */
export type SystemRole = LineupRole | RoleKey42 | RoleKey60;
export type SystemLineup = Partial<Record<SystemRole, Player>>;

export const ROLE_LABEL_42: Record<RoleKey42 | 'L', string> = {
  S1: 'A1',
  OH1: 'P1',
  MB2: 'C2',
  S2: 'A2',
  OH2: 'P2',
  MB1: 'C1',
  L: 'L',
};

/** Zona de cada rol para una rotación, dado el orden de rotación del sistema. */
export function zonesFor<R extends string>(order: readonly R[], rotation: Zone): Record<R, Zone> {
  const result = {} as Record<R, Zone>;
  order.forEach((role, i) => {
    result[role] = (((rotation - 1 + i) % 6) + 1) as Zone;
  });
  return result;
}

/** 4-2: dos armadores (si hay uno solo, el opuesto hace de segundo armador). */
export function assignLineup42(players: Player[]): SystemLineup {
  const pool = [...players].sort((a, b) => a.number - b.number);
  const take = (...positions: Position[]) => {
    for (const pos of positions) {
      const i = pool.findIndex((p) => p.position === pos);
      if (i !== -1) return pool.splice(i, 1)[0];
    }
    return undefined;
  };
  const lineup: SystemLineup = {};
  lineup.S1 = take('armador');
  lineup.S2 = take('armador', 'opuesto');
  lineup.OH1 = take('punta', 'opuesto');
  lineup.OH2 = take('punta', 'opuesto');
  lineup.MB1 = take('central');
  lineup.MB2 = take('central');
  lineup.L = take('libero');
  return lineup;
}

/** 6-0: los seis primeros jugadores por número (sin líbero). */
export function assignLineup60(players: Player[]): SystemLineup {
  const pool = [...players].filter((p) => p.position !== 'libero').sort((a, b) => a.number - b.number);
  const lineup: SystemLineup = {};
  ROLE_ORDER_60.forEach((role, i) => {
    lineup[role] = pool[i];
  });
  return lineup;
}
