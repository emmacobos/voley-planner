import type { Player, Position, StationGroup } from './types';

/**
 * Circuito por estaciones: las jugadoras se reparten en grupos y cada grupo
 * arranca en una cancha; en cada vuelta, cada grupo pasa a la cancha siguiente.
 */
export const GROUP_COLORS = ['#7A1424', '#23201B', '#6D7B4E', '#B07A3C', '#3E4A5A', '#A0525F'];

/** Grupo que está en la cancha `courtIndex` en la vuelta `round` (0 es la primera). */
export function groupAtCourt<T>(groups: T[], courtCount: number, round: number, courtIndex: number): T | undefined {
  if (!courtCount) return undefined;
  const g = (((courtIndex - round) % courtCount) + courtCount) % courtCount;
  return groups[g];
}

/** Cancha en la que está el grupo `groupIndex` en la vuelta `round`. */
export function courtOfGroup(groupIndex: number, courtCount: number, round: number): number {
  return (groupIndex + round) % courtCount;
}

/** Tabla de la rotación: para cada vuelta, qué grupo está en cada cancha. */
export function rotationTable<T>(groups: T[], courtCount: number): (T | undefined)[][] {
  return Array.from({ length: courtCount }, (_, round) =>
    Array.from({ length: courtCount }, (_, court) => groupAtCourt(groups, courtCount, round, court)),
  );
}

const POSITION_ORDER: Position[] = ['armador', 'opuesto', 'punta', 'central', 'libero'];

/**
 * Reparte jugadoras en `count` grupos parejos: ordenadas por puesto y repartidas
 * en zigzag (1, 2, 3, 3, 2, 1…), así cada grupo tiene de todo un poco. Con
 * `random`, se mezclan las jugadoras de cada puesto y el orden de los grupos
 * (sigue parejo, pero sale distinto cada vez).
 */
export function autoGroups(players: Player[], count: number, random?: () => number): string[][] {
  const groups: string[][] = Array.from({ length: Math.max(1, count) }, () => []);
  const key = (p: Player) => (random ? random() : p.number);
  const keys = new Map(players.map((p) => [p.id, key(p)]));
  const sorted = [...players].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || keys.get(a.id)! - keys.get(b.id)!,
  );
  // En qué orden se recorren los grupos (al azar si se pide).
  const order = groups.map((_, i) => i);
  if (random) order.sort(() => random() - 0.5);
  sorted.forEach((p, i) => {
    const lap = Math.floor(i / groups.length);
    const pos = i % groups.length;
    groups[order[lap % 2 === 0 ? pos : groups.length - 1 - pos]].push(p.id);
  });
  return groups;
}

/**
 * Vuelve a repartir, distinto de como estaba, manteniendo nombres y colores
 * de los grupos.
 */
export function reshuffleGroups(groups: StationGroup[], players: Player[], random: () => number = Math.random): StationGroup[] {
  const same = (a: string[][]) => a.every((ids, i) => [...ids].sort().join() === [...(groups[i]?.playerIds ?? [])].sort().join());
  let next = autoGroups(players, groups.length, random);
  for (let tries = 0; tries < 20 && same(next) && players.length > groups.length; tries++) next = autoGroups(players, groups.length, random);
  return groups.map((g, i) => ({ ...g, playerIds: next[i] ?? [] }));
}

/** Pasa una jugadora a otro grupo. */
export function movePlayer(groups: StationGroup[], playerId: string, toGroupId: string): StationGroup[] {
  return groups.map((g) => {
    const without = g.playerIds.filter((id) => id !== playerId);
    return g.id === toGroupId ? { ...g, playerIds: [...without, playerId] } : without.length === g.playerIds.length ? g : { ...g, playerIds: without };
  });
}

/** Grupos nuevos, uno por cancha, con las jugadoras repartidas. */
export function makeGroups(players: Player[], count: number, newId: () => string): StationGroup[] {
  return autoGroups(players, count).map((playerIds, i) => ({
    id: newId(),
    name: `Grupo ${i + 1}`,
    color: GROUP_COLORS[i % GROUP_COLORS.length],
    playerIds,
  }));
}
