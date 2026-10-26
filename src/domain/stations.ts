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
 * en zigzag (1, 2, 3, 3, 2, 1…), así cada grupo tiene de todo un poco.
 */
export function autoGroups(players: Player[], count: number): string[][] {
  const groups: string[][] = Array.from({ length: Math.max(1, count) }, () => []);
  const sorted = [...players].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.number - b.number,
  );
  sorted.forEach((p, i) => {
    const lap = Math.floor(i / groups.length);
    const pos = i % groups.length;
    groups[lap % 2 === 0 ? pos : groups.length - 1 - pos].push(p.id);
  });
  return groups;
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
