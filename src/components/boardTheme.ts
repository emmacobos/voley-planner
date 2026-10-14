import type { Team } from '../domain/types';

export type Tool = 'select' | 'arrow-move' | 'arrow-ball';

export const TEAM_COLORS: Record<Team, string> = { A: '#1F4FB8', B: '#C0262D' };

/** Cancha naranja con zona libre azul, como en las transmisiones de la FIVB. */
export const COURT_COLORS = {
  freeZone: '#1D4E89',
  court: '#E9843F',
  frontZone: '#E07A35',
  net: '#0E1A2B',
};

/** Color de selección (amarillo pelota). */
export const SELECTION_COLOR = '#F5B82E';

export const DISPLAY_FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

/** El líbero usa otra camiseta. */
export const LIBERO_COLORS: Record<Team, string> = { A: '#0891b2', B: '#7e22ce' };
