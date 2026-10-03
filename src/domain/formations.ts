import { COURT_WIDTH, toCourt, zoneBasePosition } from './court';
import {
  ROLE_LABEL,
  ROLE_ORDER,
  ROLE_POSITION,
  isFrontRow,
  roleTokenId,
  zonesForRotation,
} from './rotations';
import type { Lineup, LineupRole, RoleKey } from './rotations';
import type { PlayerToken, Situation, Team, Zone } from './types';

/**
 * Formaciones del sistema 5-1. Las posiciones se expresan relativas al equipo:
 * `depth` = metros desde la red, `lateral` = metros desde su línea lateral
 * izquierda (mirando hacia la red).
 */
type Spot = { depth: number; lateral: number };
const s = (depth: number, lateral: number): Spot => ({ depth, lateral });

export type Phase =
  | 'base'
  | 'k1-recepcion'
  | 'k1-ataque'
  | 'k2-saque'
  | 'defensa-perimetral'
  | 'defensa-adelante';

/** Zona del rival desde la que ataca (para las defensas). */
export type AttackSide = 'zona4' | 'zona2';

export const PHASES: { value: Phase; label: string; description: string }[] = [
  { value: 'base', label: 'Zonas (base)', description: 'Cada jugador en el centro de su zona' },
  { value: 'k1-recepcion', label: 'K1 · Recepción', description: 'Recepción de 3 (2 puntas + líbero) con penetración del armador' },
  { value: 'k1-ataque', label: 'K1 · Ataque', description: 'Armador en posición y atacantes listos para la carrera' },
  { value: 'k2-saque', label: 'K2 · Saque', description: 'El jugador de zona 1 saca y el resto espera en su especialidad' },
  { value: 'defensa-perimetral', label: 'Defensa perimetral', description: 'Bloqueo doble y 6 atrás (2-0-4)' },
  { value: 'defensa-adelante', label: 'Defensa 6 adelante', description: 'Bloqueo doble y zona 6 detrás del bloqueo (2-1-3)' },
];

/** En qué momento del juego queda el paso al colocar cada formación. */
export function phaseSituation(phase: Phase, team: Team): Situation {
  const rival: Team = team === 'A' ? 'B' : 'A';
  switch (phase) {
    case 'base':
    case 'k1-recepcion':
      return `saque-${rival}`;
    case 'k2-saque':
      return `saque-${team}`;
    default:
      return 'juego';
  }
}

/**
 * Recepción K1 por rotación (indexada por la zona del armador). Recepción de
 * 3 con los dos puntas y el líbero; opuesto y centrales no reciben. Todas las
 * formaciones respetan las reglas de posición (hay tests que lo verifican).
 */
const RECEPTION: Record<Zone, Partial<Record<LineupRole, Spot>>> = {
  1: { OPP: s(1.5, 0.8), MB2: s(1.0, 4.0), OH1: s(5.0, 7.2), OH2: s(5.5, 1.8), L: s(6.0, 4.5), S: s(7.5, 8.3) },
  2: { MB2: s(0.8, 1.0), OH1: s(5.0, 2.0), S: s(0.8, 7.5), OPP: s(7.5, 0.8), OH2: s(5.8, 4.5), L: s(5.5, 7.2) },
  3: { OH1: s(5.0, 1.8), S: s(0.8, 5.5), MB1: s(1.0, 8.0), L: s(5.8, 3.8), OPP: s(8.0, 5.0), OH2: s(5.5, 7.2) },
  4: { S: s(0.8, 3.5), MB1: s(1.0, 4.8), OH2: s(5.0, 7.2), OH1: s(5.5, 1.8), L: s(6.0, 4.5), OPP: s(7.5, 8.3) },
  5: { MB1: s(0.8, 1.0), OH2: s(5.0, 1.8), OPP: s(1.0, 8.0), S: s(1.8, 0.8), OH1: s(5.8, 4.5), L: s(5.5, 7.2) },
  6: { OH2: s(5.0, 1.5), OPP: s(1.0, 5.5), MB2: s(1.0, 8.0), L: s(6.0, 4.0), S: s(2.0, 6.0), OH1: s(5.5, 7.2) },
};

/** Puesto de especialidad: fila (F/B) y lado (L izquierda, M medio, R derecha). */
type Slot = 'FL' | 'FM' | 'FR' | 'BL' | 'BM' | 'BR';

const SAQUE: Record<Slot, Spot> = {
  FL: s(1.0, 1.5),
  FM: s(1.0, 4.5),
  FR: s(1.0, 7.5),
  BL: s(6.5, 1.5),
  BM: s(7.0, 4.5),
  BR: s(6.5, 7.5),
};
const SERVER_SPOT = s(9.8, 7.5);

const ATAQUE: Record<Slot, Spot> = {
  FL: s(3.5, 0.5),
  FM: s(2.0, 5.0),
  FR: s(3.5, 8.5),
  BL: s(6.0, 2.5),
  BM: s(5.0, 4.5),
  BR: s(5.0, 7.8),
};
const SETTER_SPOT = s(0.6, 6.0);

/** Defensas contra ataque rival por zona 4 (que llega a nuestro lado derecho). */
const DEFENSE: Record<'defensa-perimetral' | 'defensa-adelante', Record<Slot, Spot>> = {
  'defensa-perimetral': {
    FR: s(0.5, 7.8),
    FM: s(0.5, 6.9),
    FL: s(3.2, 1.5),
    BR: s(5.5, 8.3),
    BM: s(8.0, 5.0),
    BL: s(6.0, 1.0),
  },
  'defensa-adelante': {
    FR: s(0.5, 7.8),
    FM: s(0.5, 6.9),
    FL: s(3.2, 1.5),
    BR: s(6.5, 8.3),
    BM: s(3.2, 6.0),
    BL: s(6.5, 1.2),
  },
};

const MIRROR_SLOT: Record<Slot, Slot> = { FL: 'FR', FM: 'FM', FR: 'FL', BL: 'BR', BM: 'BM', BR: 'BL' };

function defenseSpot(phase: keyof typeof DEFENSE, slot: Slot, side: AttackSide): Spot {
  if (side === 'zona4') return DEFENSE[phase][slot];
  const spot = DEFENSE[phase][MIRROR_SLOT[slot]];
  return s(spot.depth, COURT_WIDTH - spot.lateral);
}

/**
 * Puesto de especialidad de cada rol. Adelante: punta a la izquierda, central
 * al medio, armador u opuesto a la derecha. Atrás: líbero (o central) en 5,
 * punta en 6, armador u opuesto en 1.
 */
function slotFor(role: LineupRole, zone: Zone): Slot {
  const row = isFrontRow(zone) ? 'F' : 'B';
  if (role === 'OH1' || role === 'OH2') return row === 'F' ? 'FL' : 'BM';
  if (role === 'MB1' || role === 'MB2' || role === 'L') return row === 'F' ? 'FM' : 'BL';
  return `${row}R`;
}

/** Qué central sale por el líbero, o null si el líbero no entra. */
function liberoReplaces(phase: Phase, zones: Record<RoleKey, Zone>): RoleKey | null {
  if (phase === 'base') return null;
  const backMb = (['MB1', 'MB2'] as const).find((r) => !isFrontRow(zones[r]))!;
  // Cuando sacamos, si el central zaguero está en zona 1 es el sacador: el líbero no entra.
  const serving = phase === 'k2-saque' || phase.startsWith('defensa');
  if (serving && zones[backMb] === 1) return null;
  return backMb;
}

export interface FormationOptions {
  lineup?: Lineup;
  attackSide?: AttackSide;
}

/** Crea las fichas de un equipo en la formación pedida. */
export function formationTokens(
  team: Team,
  rotation: Zone,
  phase: Phase,
  { lineup = {}, attackSide = 'zona4' }: FormationOptions = {},
): PlayerToken[] {
  const zones = zonesForRotation(rotation);
  const replaced = liberoReplaces(phase, zones);
  const roles: { role: LineupRole; zone: Zone }[] = ROLE_ORDER.map((role) =>
    role === replaced ? { role: 'L', zone: zones[role] } : { role, zone: zones[role] },
  );

  return roles.map(({ role, zone }) => {
    let spot: Spot | null = null;
    switch (phase) {
      case 'base':
        break;
      case 'k1-recepcion':
        spot = RECEPTION[rotation][role]!;
        break;
      case 'k1-ataque':
        spot = role === 'S' ? SETTER_SPOT : ATAQUE[slotFor(role, zone)];
        break;
      case 'k2-saque':
        spot = zone === 1 ? SERVER_SPOT : SAQUE[slotFor(role, zone)];
        break;
      default:
        spot = defenseSpot(phase, slotFor(role, zone), attackSide);
    }
    const player = lineup[role];
    return {
      id: roleTokenId(team, role),
      kind: 'player',
      team,
      zone,
      role: ROLE_POSITION[role],
      playerId: player?.id,
      label: player ? String(player.number) : ROLE_LABEL[role],
      ...(spot ? toCourt(team, spot.depth, spot.lateral) : zoneBasePosition(team, zone)),
    };
  });
}

/** Ids de las fichas que coloca una formación (para reemplazarlas). */
export function formationTokenIds(team: Team): Set<string> {
  return new Set([...ROLE_ORDER, 'L' as const].map((r) => roleTokenId(team, r)));
}
