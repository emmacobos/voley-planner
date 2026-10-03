import type { Team } from '../domain/types';

export type Tool = 'select' | 'arrow-move' | 'arrow-ball';

export const TEAM_COLORS: Record<Team, string> = { A: '#1d4ed8', B: '#b91c1c' };
