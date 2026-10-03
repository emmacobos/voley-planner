import { zoneBasePosition } from './court';
import type { Player, PlayerToken, Position, Team, Zone } from './types';
import { positionShort } from './types';

/** Roles del sistema 5-1, en el orden en que se suceden en la rotación. */
export const ROLE_ORDER = ['S', 'OH1', 'MB2', 'OPP', 'OH2', 'MB1'] as const;
export type RoleKey = (typeof ROLE_ORDER)[number];

const ROLE_POSITION: Record<RoleKey, Position> = {
  S: 'armador',
  OH1: 'punta',
  MB2: 'central',
  OPP: 'opuesto',
  OH2: 'punta',
  MB1: 'central',
};

const ROLE_LABEL: Record<RoleKey, string> = {
  S: 'A',
  OH1: 'P1',
  MB2: 'C2',
  OPP: 'O',
  OH2: 'P2',
  MB1: 'C1',
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

/**
 * Asigna jugadores del plantel a los roles del 5-1 según su posición.
 * Los roles sin jugador disponible quedan sin asignar.
 */
export function assignLineup(players: Player[]): Partial<Record<RoleKey, Player>> {
  const pool = [...players].sort((a, b) => a.number - b.number);
  const take = (pos: Position) => {
    const i = pool.findIndex((p) => p.position === pos);
    return i === -1 ? undefined : pool.splice(i, 1)[0];
  };
  const lineup: Partial<Record<RoleKey, Player>> = {};
  lineup.S = take('armador');
  lineup.OPP = take('opuesto');
  lineup.OH1 = take('punta');
  lineup.OH2 = take('punta');
  lineup.MB1 = take('central');
  lineup.MB2 = take('central');
  return lineup;
}

/** Id estable por equipo y rol, para que la animación entre rotaciones funcione. */
export function roleTokenId(team: Team, role: RoleKey): string {
  return `${team}-${role}`;
}

/** Crea las 6 fichas de un equipo en su posición base para la rotación indicada. */
export function rotationTokens(
  team: Team,
  rotation: Zone,
  lineup: Partial<Record<RoleKey, Player>> = {},
): PlayerToken[] {
  const zones = zonesForRotation(rotation);
  return ROLE_ORDER.map((role) => {
    const zone = zones[role];
    const player = lineup[role];
    const position = ROLE_POSITION[role];
    return {
      id: roleTokenId(team, role),
      kind: 'player',
      team,
      zone,
      role: position,
      playerId: player?.id,
      label: player ? String(player.number) : ROLE_LABEL[role],
      ...zoneBasePosition(team, zone),
    };
  });
}

export function tokenSubLabel(token: PlayerToken): string {
  return positionShort(token.role);
}
