import { distanceToNet, lateralFromLeft } from './court';
import type { BoardElement, PlayerToken, Team, Zone } from './types';

export interface RotationCheck {
  team: Team;
  /** false si el equipo no tiene exactamente una ficha por zona (1 a 6). */
  applicable: boolean;
  faults: string[];
}

/** Pares delantero/zaguero que deben respetar el orden respecto de la red. */
const FRONT_BACK: [Zone, Zone][] = [
  [4, 5],
  [3, 6],
  [2, 1],
];

/** Tríos de izquierda a derecha (desde el punto de vista del equipo). */
const ROWS: [Zone, Zone, Zone][] = [
  [4, 3, 2],
  [5, 6, 1],
];

/**
 * Verifica las faltas de posición al momento del saque (regla 7.4 FIVB),
 * usando el centro de cada ficha como referencia.
 */
export function checkRotation(
  elements: BoardElement[],
  team: Team,
  nameOf: (t: PlayerToken) => string = (t) => t.label,
): RotationCheck {
  const tokens = elements.filter(
    (e): e is PlayerToken =>
      e.kind === 'player' && e.team === team && e.zone !== undefined,
  );
  const byZone = new Map<Zone, PlayerToken>();
  for (const t of tokens) {
    if (byZone.has(t.zone!)) return { team, applicable: false, faults: [] };
    byZone.set(t.zone!, t);
  }
  if (byZone.size !== 6) return { team, applicable: false, faults: [] };

  const get = (z: Zone) => byZone.get(z)!;
  const label = (z: Zone) => `zona ${z} (${nameOf(get(z))})`;
  const faults: string[] = [];

  for (const [front, back] of FRONT_BACK) {
    if (distanceToNet(team, get(front).x) >= distanceToNet(team, get(back).x)) {
      faults.push(
        `${capitalize(label(front))} debe estar más cerca de la red que ${label(back)}.`,
      );
    }
  }

  for (const [left, middle, right] of ROWS) {
    const lat = (z: Zone) => lateralFromLeft(team, get(z).y);
    if (lat(left) >= lat(middle)) {
      faults.push(
        `${capitalize(label(left))} debe estar a la izquierda de ${label(middle)}.`,
      );
    }
    if (lat(middle) >= lat(right)) {
      faults.push(
        `${capitalize(label(middle))} debe estar a la izquierda de ${label(right)}.`,
      );
    }
  }

  return { team, applicable: true, faults };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
