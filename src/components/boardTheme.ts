import type { Team } from '../domain/types';

export type Tool = 'select' | 'arrow-move' | 'arrow-ball' | 'arrow-curve' | 'arrow-curve-dashed';

export const TEAM_COLORS: Record<Team, string> = { A: '#1F4FB8', B: '#C0262D' };

/**
 * Colores de cancha estilo VNL: zona libre turquesa, zona de defensa salmón
 * y zona de ataque (de la línea de 3 m a la red) naranja más intenso.
 */
export const COURT_COLORS = {
  freeZone: '#27A7A6',
  court: '#F3A07C',
  frontZone: '#EC7A3C',
  net: '#0E1A2B',
};

/** Color de selección (amarillo pelota). */
export const SELECTION_COLOR = '#F5B82E';

export const DISPLAY_FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

/** El líbero usa otra camiseta. */
export const LIBERO_COLORS: Record<Team, string> = { A: '#0891b2', B: '#7e22ce' };
