import type { Team } from '../domain/types';

export type Tool = 'select' | 'arrow-move' | 'arrow-ball' | 'arrow-curve' | 'arrow-curve-dashed';

export const TEAM_COLORS: Record<Team, string> = { A: '#1F4FB8', B: '#C0262D' };

/**
 * Cancha de estadio: madera clara con la zona de ataque más oscura, franja
 * azul alrededor, piso claro hasta los carteles de los bordes.
 */
export const COURT_COLORS = {
  court: '#E8D3AE',
  frontZone: '#C99A68',
  lines: '#FFFFFF',
  bandColor: '#1F3C9C',
  /** Ancho de la franja azul más allá de las líneas de fondo y laterales (m). */
  band: { ends: 2.3, sides: 2.1 },
  floor: '#E6D6B8',
  boards: '#14204A',
  /** Profundidad de los carteles en el borde (m). */
  boardDepth: 0.3,
  zoneText: '#6B4A25',
  net: '#0E1A2B',
};

/** Color de selección (amarillo pelota). */
export const SELECTION_COLOR = '#F5B82E';

export const DISPLAY_FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

/** El líbero usa otra camiseta. */
export const LIBERO_COLORS: Record<Team, string> = { A: '#0891b2', B: '#7e22ce' };
