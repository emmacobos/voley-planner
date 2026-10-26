import { VIEW } from '../domain/court';
import type { Team } from '../domain/types';

export type Tool =
  | 'select'
  | 'arrow-move'
  | 'arrow-ball'
  | 'arrow-curve'
  | 'arrow-curve-dashed'
  | 'shadow'
  | 'text';

export const TEAM_COLORS: Record<Team, string> = { A: '#23201B', B: '#7A1424' };

/**
 * Cancha de estadio: madera clara con la zona de ataque más oscura, franja
 * azul alrededor, piso claro hasta los carteles de los bordes.
 */
export const COURT_COLORS = {
  court: '#E8D3AE',
  frontZone: '#C99A68',
  lines: '#FFFFFF',
  bandColor: '#1A1814',
  /** Ancho de la franja azul más allá de las líneas de fondo y laterales (m). */
  band: { ends: 2.3, sides: 2.1 },
  floor: '#E6D6B8',
  boards: '#0B0A08',
  /** Profundidad de los carteles en el borde (m). */
  boardDepth: 0.3,
  zoneText: '#6B4A25',
  net: '#0E1A2B',
};

/** Color de selección (amarillo pelota). */
export const SELECTION_COLOR = '#C99A4E';

export const DISPLAY_FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

/** El líbero usa otra camiseta. */
export const LIBERO_COLORS: Record<Team, string> = { A: '#B07A3C', B: '#A0525F' };

/** viewBox de la pizarra, horizontal o vertical (girada -90°). */
export function boardViewBox(vertical = false): string {
  return vertical
    ? `${VIEW.minY} ${-(VIEW.minX + VIEW.width)} ${VIEW.height} ${VIEW.width}`
    : `${VIEW.minX} ${VIEW.minY} ${VIEW.width} ${VIEW.height}`;
}
