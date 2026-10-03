export type Position = 'armador' | 'opuesto' | 'central' | 'punta' | 'libero';

export const POSITIONS: { value: Position; label: string; short: string }[] = [
  { value: 'armador', label: 'Armador', short: 'A' },
  { value: 'opuesto', label: 'Opuesto', short: 'O' },
  { value: 'central', label: 'Central', short: 'C' },
  { value: 'punta', label: 'Punta', short: 'P' },
  { value: 'libero', label: 'Líbero', short: 'L' },
];

export function positionLabel(p: Position | undefined): string {
  return POSITIONS.find((x) => x.value === p)?.label ?? '';
}

export function positionShort(p: Position | undefined): string {
  return POSITIONS.find((x) => x.value === p)?.short ?? '';
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
}

export type Team = 'A' | 'B';

/** Zona de rotación (1 a 6). */
export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

interface Positioned {
  id: string;
  x: number;
  y: number;
}

export interface PlayerToken extends Positioned {
  kind: 'player';
  team: Team;
  label: string;
  role?: Position;
  playerId?: string;
  zone?: Zone;
}

export interface BallElement extends Positioned {
  kind: 'ball';
}

export interface ConeElement extends Positioned {
  kind: 'cone';
}

export interface CoachElement extends Positioned {
  kind: 'coach';
}

export interface CartElement extends Positioned {
  kind: 'cart';
}

export type ArrowStyle = 'move' | 'ball';

export interface ArrowElement {
  id: string;
  kind: 'arrow';
  style: ArrowStyle;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type PointElement =
  | PlayerToken
  | BallElement
  | ConeElement
  | CoachElement
  | CartElement;

export type BoardElement = PointElement | ArrowElement;

export interface Frame {
  id: string;
  note: string;
  elements: BoardElement[];
}

export type ExerciseType = 'analitico' | 'sintetico' | 'global';

export const EXERCISE_TYPES: {
  value: ExerciseType;
  label: string;
  description: string;
}[] = [
  {
    value: 'analitico',
    label: 'Analítico',
    description: 'Técnica aislada de un fundamento',
  },
  {
    value: 'sintetico',
    label: 'Sintético',
    description: 'Combina fundamentos o una fase del juego',
  },
  { value: 'global', label: 'Global', description: 'Situación real de juego' },
];

export type Intensity = 'baja' | 'media' | 'alta';

export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  objective: string;
  durationMin: number;
  intensity: Intensity;
  notes: string;
  playerIds: string[];
  frames: Frame[];
  createdAt: string;
  updatedAt: string;
}
