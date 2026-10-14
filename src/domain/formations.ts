import { COURT_WIDTH, toCourt, zoneBasePosition } from './court';
import {
  ROLE_LABEL,
  ROLE_LABEL_42,
  ROLE_ORDER,
  ROLE_ORDER_42,
  ROLE_ORDER_60,
  ROLE_POSITION,
  isFrontRow,
  roleTokenId,
  zonesFor,
  zonesForRotation,
} from './rotations';
import type { LineupRole, RoleKey, SystemLineup, SystemRole } from './rotations';
import type { GameSystem, PlayerToken, Position, Situation, Team, Zone } from './types';

export const GAME_SYSTEMS: { value: GameSystem; label: string; description: string }[] = [
  {
    value: '5-1',
    label: '5-1',
    description: 'Un armador que arma en las 6 rotaciones (penetra cuando está atrás), opuesto, 2 puntas, 2 centrales y líbero.',
  },
  {
    value: '4-2',
    label: '4-2',
    description:
      'Dos armadores enfrentados: arma siempre el que está adelante, así hay 2 atacantes en la red. 2 puntas, 2 centrales y líbero.',
  },
  {
    value: '6-0',
    label: '6-0',
    description: 'Seis jugadores universales, sin especialistas ni líbero: arma el que pasa por la zona elegida.',
  },
];

/** En el 6-0, zona desde la que arma el jugador que pasa por ella. */
export type SetterZone = 2 | 3;

/** Título de la rotación (se nombra por la zona del primer rol del sistema). */
export function rotationLabel(system: GameSystem, rotation: Zone): string {
  if (system === '4-2') return `Rotación (armador 1 en la zona ${rotation})`;
  if (system === '6-0') return `Rotación (jugador 1 en la zona ${rotation})`;
  return `Rotación (armador en la zona ${rotation})`;
}

/**
 * Formaciones de los sistemas de juego. Las posiciones se expresan relativas al equipo:
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

/** Las fases con la descripción que corresponde a cada sistema. */
export function phasesFor(system: GameSystem, setterZone: SetterZone = 3): typeof PHASES {
  return PHASES.map((p) => {
    if (system === '4-2' && p.value === 'k1-recepcion')
      return { ...p, description: 'Recepción de 3 (2 puntas + líbero); arma el armador que está adelante' };
    if (system === '6-0' && p.value === 'k1-recepcion')
      return { ...p, description: `Recepción en W con 5 receptores; el de zona ${setterZone} espera en la red para armar` };
    if (system === '6-0' && p.value === 'k1-ataque')
      return { ...p, description: `Arma el jugador de zona ${setterZone} y atacan los otros dos de adelante` };
    return p;
  });
}

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

/** 6-0: puesto según la zona (no hay cambios de puesto). */
const ZONE_SLOT: Record<Zone, Slot> = { 4: 'FL', 3: 'FM', 2: 'FR', 5: 'BL', 6: 'BM', 1: 'BR' };

/**
 * Recepción en W del 6-0 según la zona del armador: el armador espera en la red
 * y los otros 5 reciben (3 adelante y 2 atrás), respetando las reglas de posición.
 */
const RECEPTION_60: Record<SetterZone, Record<Zone, Spot>> = {
  3: { 3: s(0.8, 4.8), 4: s(4.0, 1.2), 6: s(4.5, 4.5), 2: s(4.0, 7.8), 5: s(7.0, 2.8), 1: s(7.0, 6.2) },
  2: { 2: s(0.8, 7.0), 4: s(4.0, 1.2), 3: s(4.2, 4.5), 1: s(4.5, 7.8), 5: s(7.0, 2.8), 6: s(7.0, 6.0) },
};
const SETTER_SPOT_60: Record<SetterZone, Spot> = { 3: s(0.6, 4.8), 2: s(0.6, 6.2) };

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
  system?: GameSystem;
  lineup?: SystemLineup;
  attackSide?: AttackSide;
  /** Solo 6-0. */
  setterZone?: SetterZone;
}

interface Placed {
  role: SystemRole;
  zone: Zone;
  spot: Spot | null;
  position?: Position;
  label: string;
}

/** Ubica los roles del 5-1 (también lo usa el 4-2, que es un 5-1 con el opuesto armando). */
function place51(rotation: Zone, phase: Phase, attackSide: AttackSide): { role: LineupRole; zone: Zone; spot: Spot | null }[] {
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
    return { role, zone, spot };
  });
}

/**
 * 4-2: arma el armador que está adelante. Equivale a un 5-1 en una rotación con
 * el armador adelante, donde el otro armador ocupa el lugar del opuesto.
 */
function place42(rotation: Zone, phase: Phase, attackSide: AttackSide): Placed[] {
  const firstFront = isFrontRow(zonesFor(ROLE_ORDER_42, rotation).S1);
  const rotation51 = (firstFront ? rotation : ((rotation + 2) % 6) + 1) as Zone;
  const as42: Record<LineupRole, SystemRole> = firstFront
    ? { S: 'S1', OH1: 'OH1', MB2: 'MB2', OPP: 'S2', OH2: 'OH2', MB1: 'MB1', L: 'L' }
    : { S: 'S2', OH1: 'OH2', MB2: 'MB1', OPP: 'S1', OH2: 'OH1', MB1: 'MB2', L: 'L' };
  return place51(rotation51, phase, attackSide).map(({ role, zone, spot }) => {
    const role42 = as42[role] as keyof typeof ROLE_LABEL_42;
    return {
      role: role42,
      zone,
      spot,
      position: role === 'OPP' ? 'armador' : ROLE_POSITION[role],
      label: ROLE_LABEL_42[role42],
    };
  });
}

/** 6-0: cada jugador ocupa el puesto de su zona y arma el de la zona elegida. */
function place60(rotation: Zone, phase: Phase, attackSide: AttackSide, setterZone: SetterZone): Placed[] {
  const zones = zonesFor(ROLE_ORDER_60, rotation);
  return ROLE_ORDER_60.map((role) => {
    const zone = zones[role];
    const setter = zone === setterZone;
    let spot: Spot | null = null;
    switch (phase) {
      case 'base':
        break;
      case 'k1-recepcion':
        spot = RECEPTION_60[setterZone][zone];
        break;
      case 'k1-ataque':
        spot = setter ? SETTER_SPOT_60[setterZone] : ATAQUE[ZONE_SLOT[zone]];
        break;
      case 'k2-saque':
        spot = zone === 1 ? SERVER_SPOT : SAQUE[ZONE_SLOT[zone]];
        break;
      default:
        spot = defenseSpot(phase, ZONE_SLOT[zone], attackSide);
    }
    return { role, zone, spot, position: setter ? 'armador' : undefined, label: role };
  });
}

/** Crea las fichas de un equipo en la formación pedida. */
export function formationTokens(
  team: Team,
  rotation: Zone,
  phase: Phase,
  { system = '5-1', lineup = {}, attackSide = 'zona4', setterZone = 3 }: FormationOptions = {},
): PlayerToken[] {
  const placed: Placed[] =
    system === '4-2'
      ? place42(rotation, phase, attackSide)
      : system === '6-0'
        ? place60(rotation, phase, attackSide, setterZone)
        : place51(rotation, phase, attackSide).map((p) => ({ ...p, position: ROLE_POSITION[p.role], label: ROLE_LABEL[p.role] }));

  return placed.map(({ role, zone, spot, position, label }) => {
    const player = lineup[role];
    return {
      id: roleTokenId(team, role),
      kind: 'player',
      team,
      zone,
      role: position,
      playerId: player?.id,
      label: player ? String(player.number) : label,
      ...(spot ? toCourt(team, spot.depth, spot.lateral) : zoneBasePosition(team, zone)),
    };
  });
}

/** Ids de las fichas que coloca una formación (para reemplazarlas). */
export function formationTokenIds(team: Team): Set<string> {
  const roles: SystemRole[] = [...ROLE_ORDER, ...ROLE_ORDER_42, ...ROLE_ORDER_60, 'L'];
  return new Set(roles.map((r) => roleTokenId(team, r)));
}
